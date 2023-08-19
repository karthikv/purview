import * as http from "http"
import * as pathLib from "path"
import * as util from "util"
import * as WebSocket from "ws"
import { nanoid } from "nanoid"
import * as t from "io-ts"

import Component, { ComponentConstructor } from "./component"
import {
  tryParseJSON,
  mapNested,
  isEventAttr,
  toEventName,
  CAPTURE_TEXT,
  findNested,
  isJSXElement,
  STYLE_TAG_ID,
  WS_PING_INTERVAL,
  WS_PONG_TIMEOUT,
} from "./helpers"
import {
  ServerMessage,
  ClientMessage,
  EventCallback,
  PNode,
  PNodeRegular,
  UpdateMessage,
  PurviewEvent,
} from "./types/ws"
import {
  makeInputEventValidator,
  makeChangeEventValidator,
  submitEventValidator,
  keyEventValidator,
  clientMessageValidator,
} from "./validators"
import { Attrs } from "snabbdom/modules/attributes"
import * as DevNull from "dev-null"
import { toHTML } from "./to_html"
import {
  generateClass,
  generateRuleTemplate,
  generateRule,
  getAtomicProperties,
} from "./css"
import { JSXInternal } from "./types/jsx"

const InternalComponent = Component

declare module "http" {
  interface IncomingMessage {
    purviewState?: {
      wsState: WebSocketState
      idStateTrees: IDStateTree[]
      roots?: ConnectedRoot[]
    }
    purviewCSSState?: CSSState
    purviewCSSRendered?: boolean
  }
}
export interface RenderOptions {
  onError?: ErrorHandler
}
interface WebSocketOptions {
  origin: string | null
}

type WebSocketState = WebSocketStateHasCSS | WebSocketStateNoCSS

interface WebSocketStateHasCSS extends BaseWebSocketState {
  hasCSS: true
  cssState: CSSState
}

interface WebSocketStateNoCSS extends BaseWebSocketState {
  hasCSS: false
  cssState?: undefined
}

interface BaseWebSocketState {
  ws: WebSocket
  roots: ConnectedRoot[]
  connectionState: null | "connecting" | "connected"
  mounted: boolean
  closing: boolean
  seenEventNames: Set<string>
}

// Represents a root of a component tree after the WebSocket has connected.
interface ConnectedRoot {
  connected: true
  component: Component<any, any>
  wsState: WebSocketState
  eventNames: Set<string>
  aliases: Record<string, string | undefined>
  allComponentsMap: Record<string, Component<any, any> | undefined>
  onError: ErrorHandler | null
}

// Represents a root of a component tree before the WebSocket has connected
// (i.e. only during an initial render).
interface DisconnectedRoot {
  connected: false
  cssState: CSSState
  onError: ErrorHandler | null
}

interface CSSState {
  id: string
  // Maps a single CSS property to a class name.
  atomicCSS: Record<string, string | undefined>
  // Each element is a propertly formatted CSS rule with a class
  // name and single property.
  cssRules: string[]
  // The index of the next rule to add to the CSSOM.
  nextRuleIndex: number
}

export type ChildMap<T> = Record<string, T[] | undefined>

export interface StateTree {
  name: string
  state: Record<string, any>
  childMap: ChildMap<StateTree>
  // Whether to merge state with the result of getInitialState() to hot reload
  // this component.
  reload: boolean
}

export interface EventHandler {
  eventName: string
  callback: EventCallback
  validator?: t.Type<any, any, any>
}

export type ErrorHandler = (error: unknown) => void

interface IDStateTree {
  id: string
  stateTree: StateTree
}

const INPUT_TYPE_VALIDATOR: Record<
  string,
  t.Type<any, any, any> | undefined
> = {
  checkbox: t.boolean,
  number: t.number,
}

const cachedEventIDs: WeakMap<EventCallback, string> = new WeakMap()

// By definition, the onError handler is expected to have side effects, so it
// is important that each error is passed to it exactly once.
//
// We keep track of errors that have already been passed to the onError handler
// below such that the same error is never passed twice. For example, an error
// that occurs in a component.render() call caused by an event callback (e.g.
// an awaited component.setState() that subsequently triggers a render) could
// otherwise be passed to onError more than once.
const seenErrors = new WeakSet()

const WEBSOCKET_BAD_STATUS_FORMAT =
  "Purview: request to your server (GET %s) returned status code %d, so we couldn't start the WebSocket connection."
const WEBSOCKET_NO_RENDER_FORMAT =
  "Purview: request to your server (GET %s) didn't render any components, so we couldn't start the WebSocket connection."
export const RENDER_CSS_ORDERING_ERROR =
  "Purview: you called renderCSS() and then subsequently called render(). Calls to render() must come before renderCSS() so that renderCSS() can add all relevant styles."
const RENDER_CSS_NOT_CALLED_ERROR =
  "Purview: You attempted to use the css attribute in a tag, but renderCSS was never called, so Purview could not add styles. Make sure to call renderCSS and include its output in the head tag during the initial render."

function containsControlledOption(
  children: JSXInternal.Child | NestedArray<JSXInternal.Child>,
): boolean {
  if (children instanceof Array) {
    const controlled = findNested(children, child => {
      if (!isJSXElement(child)) {
        return false
      }

      if (child.nodeName === "optgroup") {
        return containsControlledOption(child.children)
      } else {
        return isControlledOption(child)
      }
    })
    return Boolean(controlled)
  } else {
    return isJSXElement(children) && isControlledOption(children)
  }
}

function isControlledOption(jsx: JSXInternal.Element): boolean {
  return jsx.nodeName === "option" && "data-controlled" in jsx.attributes
}

const terminationTimers = new WeakMap<
  WebSocket,
  ReturnType<typeof setTimeout> | null
>()

// If a client doesn't respond with a pong in the timeout (given in
// milliseconds), forcibly terminate the connection.
export function pingClients(wsServer: WebSocket.Server, timeout: number): void {
  for (const ws of wsServer.clients) {
    // If a WebSocket is in the closing state, ws.ping() (which is called
    // further below) will throw the following error: Error: WebSocket is not
    // open: readyState 2 (CLOSING)
    //
    // Prevent this from happening by checking the state.
    if (ws.readyState !== WebSocket.OPEN) {
      continue
    }

    if (!terminationTimers.has(ws)) {
      // First time we're processing this websocket; listen for pongs to clear
      // the termination timer.
      ws.on("pong", () => {
        const timer = terminationTimers.get(ws)
        if (timer) {
          clearTimeout(timer)
        }

        // N.B. We want to maintain an association in the WeakMap so that we
        // don't add another pong handler.
        terminationTimers.set(ws, null)
      })
    }

    // If no termination timer is set, either because one has never been set, or
    // because the last was cleared from a pong, set one.
    if (!terminationTimers.get(ws)) {
      terminationTimers.set(
        ws,
        setTimeout(() => ws.terminate(), timeout),
      )
    }

    // Ask the client to send us a pong.
    ws.ping()
  }
}

function makeStateTree(
  component: Component<any, any>,
  reload: boolean,
): StateTree {
  const childMap: ChildMap<StateTree> = {}
  Object.keys(component._childMap).forEach(key => {
    const children = component._childMap[key]!
    childMap[key] = children.map((c: any) =>
      makeStateTree(c as Component<any, any>, reload),
    )
  })

  const componentConstructor = component.constructor as ComponentConstructor<
    unknown,
    unknown
  >
  return {
    name: componentConstructor.getUniqueName(),
    state: (component as any).state,
    childMap,
    reload,
  }
}

async function handleMessage(
  message: ClientMessage,
  wsState: WebSocketState,
  req: http.IncomingMessage,
  server: http.Server,
): Promise<void> {
  switch (message.type) {
    case "connect": {
      if (wsState.connectionState !== null) {
        break
      }
      wsState.connectionState = "connecting"

      const cssStateID = message.cssStateID
      if (cssStateID) {
        const cssState = await Purview.reloadOptions.getCSSState(cssStateID)
        if (!cssState) {
          // Can't load CSS state; close WebSocket and force refresh.
          wsState.ws.close()
          return
        }
        wsState.hasCSS = true
        wsState.cssState = cssState
      }

      if (message.rootIDs.length === 0) {
        throw new Error("Purview: no rootIDs provided.")
      }

      const promises = message.rootIDs.map(async id => {
        return { id, stateTree: await Purview.reloadOptions.getStateTree(id) }
      })
      const idStateTrees = await Promise.all(promises)
      if (idStateTrees.some(ist => !ist.stateTree)) {
        // Can't load state tree; close WebSocket and force refresh.
        wsState.ws.close()
        return
      }

      req.purviewState = {
        wsState,
        idStateTrees: idStateTrees as IDStateTree[],
      }

      const res = new http.ServerResponse(req)
      const nullStream = new DevNull()
      res.assignSocket(nullStream as any)
      server.emit("request", req, res)

      const roots = await new Promise<ConnectedRoot[]>((resolve, reject) => {
        res.on("finish", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            const errorMessage = util.format(
              WEBSOCKET_BAD_STATUS_FORMAT,
              req.url,
              res.statusCode,
            )
            reject(new Error(errorMessage))
          } else if (req.purviewState!.roots) {
            resolve(req.purviewState!.roots)
          } else {
            const errorMessage = util.format(
              WEBSOCKET_NO_RENDER_FORMAT,
              req.url,
            )
            reject(new Error(errorMessage))
          }
        })
      })

      roots.forEach(root => {
        root.wsState = wsState
        wsState.roots.push(root)

        sendMessage(root.wsState.ws, {
          type: "update",
          componentID: root.component._id,
          pNode: toLatestPNode(root.component._pNode),
          newEventNames: Array.from(root.eventNames),
        })

        // Don't wait for this, since we want wsState.mounted and wsState.roots
        // to be updated atomically. Mounting is an asynchronous event anyway.
        void root.component._triggerMount(root.allComponentsMap)
      })
      wsState.mounted = true

      const deletePromises = message.rootIDs.map(id =>
        Purview.reloadOptions.deleteStateTree(id),
      )
      if (cssStateID) {
        deletePromises.push(Purview.reloadOptions.deleteCSSState(cssStateID))
      }
      await Promise.all(deletePromises)

      wsState.connectionState = "connected"
      // Because both the "close" and "connect" events are async, we check if
      // `closing` is set because it could be the case that the "close" event
      // fires just after the "connect" event (e.g., on page refresh), and the
      // "close" event will see that the `wsState.roots` is an empty array due
      // to the "connect" event still being in progress. This would result in an
      // incomplete cleanup of the previous connection's state. Hence, we check
      // the `closing` flag and clean up any existing state that the "closing"
      // event could not clean up if needed.
      if (wsState.closing) {
        await cleanUpWebSocketState(wsState)
        wsState.closing = false
      }

      break
    }

    case "event": {
      const root = wsState.roots.find(r => r.component._id === message.rootID)
      if (!root) {
        break
      }

      let component = root.allComponentsMap[message.componentID]
      if (!component) {
        break
      }

      // The component might directly nest another component, at which point the
      // handler will be in the nested component due to component ID aliasing.
      // Note that this can happen recursively.
      while (component._directlyNests) {
        // TS requires us to annotate variables within this loop becuase they
        // are referenced indirectly in their initializers.
        const keys: string[] = Object.keys(component._childMap)
        if (keys.length !== 1) {
          throw new Error(
            "Expected exactly one key for directly nested component",
          )
        }

        const children: Array<Component<any, any> | StateTree> | undefined =
          component._childMap[keys[0]]
        if (!children || children.length !== 1) {
          throw new Error(
            "Expected exactly one child for directly nested component",
          )
        }

        const child: Component<any, any> | StateTree = children[0]
        if (!(child instanceof Component)) {
          throw new Error("Expected child to be a component")
        }
        component = child
      }

      const handler = component._eventHandlers[message.eventID]
      if (!handler) {
        break
      }

      if (handler.validator) {
        const decoded = handler.validator.decode(message.event)
        if (decoded.isRight()) {
          await handler.callback(decoded.value)
        }
      } else {
        await handler.callback()
      }
      break
    }

    case "seenEventNames": {
      wsState.seenEventNames = new Set(message.seenEventNames)
      break
    }

    case "nextRuleIndex": {
      const { cssState } = wsState
      if (cssState) {
        cssState.nextRuleIndex = Math.max(
          cssState.nextRuleIndex,
          message.nextRuleIndex,
        )
      }
      break
    }
  }
}

function sendMessage(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message))
  }
}

function isComponentElem(
  jsx: JSXInternal.Element,
): jsx is JSXInternal.ComponentElement {
  return (
    typeof jsx.nodeName === "function" &&
    jsx.nodeName.prototype &&
    jsx.nodeName.prototype._isPurviewComponent
  )
}

async function makeElem(
  jsx: JSXInternal.Element,
  parent: Component<any, any>,
  rootID: string,
  root: ConnectedRoot | DisconnectedRoot,
  parentKey: string,
): Promise<PNode | null> {
  let key: string
  if (isComponentElem(jsx)) {
    key = parentKey + "/" + jsx.nodeName.getUniqueName()
    const cached = parent._childMap[key]
    const existing = cached ? cached.shift() : null

    if (!parent._newChildMap[key]) {
      parent._newChildMap[key] = []
    }

    // Retain the ordering of child elements by saving the index here.
    const index = parent._newChildMap[key]!.length
    parent._newChildMap[key]!.push(null)

    return await withComponent(jsx, existing, async component => {
      if (!component) {
        return null
      }

      parent._newChildMap[key]![index] = component
      const pNode = await renderComponent(component, rootID, root)
      const wsState = root.connected && root.wsState

      if (!existing && wsState && wsState.mounted) {
        // Child components have already been mounted recursively. We don't call
        // _triggerMount() because that would recursively call componentDidMount()
        // on children again.
        component._mountSelfLocked(
          root.connected ? root.allComponentsMap : null,
        )
      }
      return pNode
    })
  }

  return makeRegularElem(jsx, parent, rootID, root, parentKey)
}

async function makeRegularElem(
  jsx: JSXInternal.Element,
  parent: Component<any, any>,
  rootID: string,
  root: ConnectedRoot | DisconnectedRoot,
  parentKey: string,
): Promise<PNode | null> {
  if (typeof jsx.nodeName !== "string") {
    throw new Error("Invalid JSX node: " + jsx.nodeName)
  }

  const { nodeName, attributes: allAttributes, children } = jsx
  const { css, ...attributes } = allAttributes
  const attrs: Attrs = {}

  Object.keys(attributes).forEach(attr => {
    if (!isEventAttr(attr)) {
      const value = (attributes as any)[attr]
      const type = typeof value

      if (type === "string" || type === "boolean" || type === "number") {
        attrs[attr.toLowerCase()] = value
      }
      return
    }

    const eventName = toEventName(attr)
    const callback = attributes[attr] as EventCallback

    let eventID = cachedEventIDs.get(callback)
    if (!eventID) {
      eventID = nanoid()
      cachedEventIDs.set(callback, eventID)
    }

    if (root.connected) {
      parent._newEventHandlers[eventID] = {
        eventName,
        async callback(event?: PurviewEvent): Promise<void> {
          try {
            await callback(event)
          } catch (error) {
            root.onError?.(error)
            if (process.env.NODE_ENV !== "test" || !root.onError) {
              throw error
            }
          }
        },
      }
      root.eventNames.add(eventName)

      let validator
      switch (eventName) {
        case "input":
        case "change":
          let makeValidator = makeInputEventValidator
          if (eventName === "change") {
            makeValidator = makeChangeEventValidator
          }

          if (nodeName === "input") {
            const type = (attributes as JSXInternal.InputHTMLAttributes)
              .type as string
            validator = makeValidator(INPUT_TYPE_VALIDATOR[type] || t.string)
          } else if (nodeName === "select") {
            const multiple = (attributes as JSXInternal.SelectHTMLAttributes)
              .multiple
            validator = makeValidator(multiple ? t.array(t.string) : t.string)
          } else if (nodeName === "textarea") {
            validator = makeValidator(t.string)
          } else {
            // Could be a parent of an input/select/textarea, or a custom
            // element. Leave validation up to the user.
            validator = makeValidator(t.any)
          }
          break

        case "keydown":
        case "keypress":
        case "keyup":
          validator = keyEventValidator
          break

        case "submit":
          validator = submitEventValidator
          break
      }
      parent._newEventHandlers[eventID]!.validator = validator
    }

    if (attr.indexOf(CAPTURE_TEXT) !== -1) {
      attrs["data-" + eventName + "-capture"] = eventID
    } else {
      attrs["data-" + eventName] = eventID
    }
  })

  if (css) {
    let cssState: CSSState
    if (root.connected) {
      if (!root.wsState.hasCSS) {
        throw new Error(RENDER_CSS_NOT_CALLED_ERROR)
      }
      cssState = root.wsState.cssState
    } else {
      cssState = root.cssState
    }

    const classNames: string[] = []
    const aps = getAtomicProperties(css)
    for (const ap of aps) {
      const ruleTemplate = generateRuleTemplate(ap)
      let className = cssState.atomicCSS[ruleTemplate]

      if (className === undefined) {
        className = generateClass(cssState.cssRules.length)
        cssState.atomicCSS[ruleTemplate] = className
        cssState.cssRules.push(generateRule(className, ruleTemplate))
      }

      classNames.push(className)
    }

    if (typeof attrs.class === "string") {
      attrs.class += " " + classNames.join(" ")
    } else {
      attrs.class = classNames.join(" ")
    }
  }

  let vChildren: Array<PNode | null>
  // Most common case: leaf text node.
  if (typeof children === "string") {
    vChildren = [createTextPNode(children)]
  } else if (children instanceof Array) {
    const promises = mapNested(children, child =>
      makeChild(child, parent, rootID, root, parentKey + "/" + nodeName),
    )
    vChildren = await Promise.all(promises)

    // Remove nulls in place to save memory.
    let nextIndex = 0
    for (const vChild of vChildren) {
      if (vChild) {
        vChildren[nextIndex] = vChild
        nextIndex++
      }
    }
    vChildren.length = nextIndex
  } else {
    const key = parentKey + "/" + nodeName
    const child = await makeChild(children, parent, rootID, root, key)
    vChildren = child ? [child] : []
  }

  return createPNode(nodeName, attrs, vChildren as PNode[])
}

function makeChild(
  child: JSXInternal.Child,
  parent: Component<any, any>,
  rootID: string,
  root: ConnectedRoot | DisconnectedRoot,
  parentKey: string,
): PNode | null | Promise<PNode | null> {
  if (child === null || child === undefined || child === false) {
    return null
  }

  if (typeof child === "object") {
    return makeElem(child, parent, rootID, root, parentKey)
  } else {
    return createTextPNode(String(child))
  }
}

async function withComponent<T>(
  jsx: JSXInternal.ComponentElement,
  existing: Component<any, any> | StateTree | null | undefined,
  callback: (component: Component<any, any> | null) => T,
  root?: ConnectedRoot | DisconnectedRoot,
): Promise<T> {
  const { nodeName, attributes, children } = jsx
  const props = Object.assign({ children }, attributes)

  let component: Component<any, any>
  if (existing instanceof Component) {
    component = existing
  } else {
    component = new nodeName(props)
  }

  return component._lock(async () => {
    if (component._unmounted) {
      return callback(null)
    }

    let stateInitialized
    if (existing instanceof Component) {
      component._setProps(props)
      component._applyChangesetsLocked()
    } else if (existing) {
      component._childMap = existing.childMap
      stateInitialized = component._initState(existing.state, existing.reload)
    } else {
      stateInitialized = component._initState()
    }

    try {
      await stateInitialized
    } catch (error) {
      root?.onError?.(error)
      throw error
    }

    return callback(component)
  })
}

async function renderComponent(
  component: Component<any, any>,
  rootID: string,
  root: ConnectedRoot | DisconnectedRoot,
): Promise<PNodeRegular | null> {
  component._newChildMap = {}
  component._newEventHandlers = {}

  let jsx
  try {
    jsx = component.render()
  } catch (error) {
    root.onError?.(error)
    throw error
  }

  const pNode = (await makeElem(
    jsx,
    component,
    rootID,
    root,
    "",
  )) as PNodeRegular | null
  if (!pNode) {
    return null
  }

  pNode.component = component
  component._pNode = pNode
  unmountChildren(component, root)

  const newChildMap: ChildMap<Component<any, any>> = {}
  Object.keys(component._newChildMap).forEach(key => {
    newChildMap[key] = component._newChildMap[key]!.filter(
      (c: any) => c !== null,
    ) as Array<Component<any, any>>
  })

  component._childMap = newChildMap
  component._eventHandlers = component._newEventHandlers

  if (root.connected && !component._handleUpdate) {
    component._handleUpdate = async () => {
      const newPNode = await renderComponent(component, rootID, root)
      if (!newPNode) {
        return
      }

      const newEventNames = new Set<string>()
      root.eventNames.forEach(name => {
        if (!root.wsState.seenEventNames.has(name)) {
          newEventNames.add(name)
        }
      })

      let cssUpdates: UpdateMessage["cssUpdates"]
      if (root.wsState.hasCSS) {
        const {
          cssState: { cssRules, nextRuleIndex },
        } = root.wsState
        const newCSSRules = cssRules.slice(nextRuleIndex)
        if (newCSSRules.length > 0) {
          cssUpdates = { newCSSRules, nextRuleIndex }
        }
      }

      sendMessage(root.wsState.ws, {
        type: "update",
        componentID: unalias(component._id, root),
        pNode: toLatestPNode(newPNode),
        newEventNames: Array.from(newEventNames),
        cssUpdates,
      })
    }
  }

  // If this component directly nests another component, a component ID will
  // already exist on elem. In this case, we override the component ID in the
  // data-component-id attribute, but keep track of the mapping in our aliases
  // map. This lets us send the proper ID in update messages to the client (see
  // the _handleUpdate function above).
  //
  // It's possible for componentID to be fully unaliased (i.e. the highest
  // ancestor in the directly nested chain) if this is the second (or later)
  // time we're rendering a nested component due to how we set the unaliased ID
  // further below. We don't add an alias in this case to avoid cyles.
  const componentID = pNode.data.attrs!["data-component-id"] as
    | string
    | undefined
  const unaliasedID = root.connected
    ? unalias(component._id, root)
    : component._id
  if (root.connected && componentID && componentID !== unaliasedID) {
    root.aliases[componentID] = unaliasedID
  }
  component._directlyNests = Boolean(componentID)

  // We may re-render a directly nested component without re-rendering the
  // parent, so we need to use the unaliased ID.
  pNode.data.attrs!["data-component-id"] = unaliasedID
  if (unaliasedID === rootID) {
    pNode.data.attrs!["data-root"] = true
  }

  return pNode
}

function createPNode(
  sel: string,
  attrs: Attrs,
  children: PNode[],
): PNodeRegular {
  return { sel, data: { attrs }, children }
}

function createTextPNode(text: string): PNode {
  return { text }
}

function toLatestPNode(pNode: PNodeRegular): PNodeRegular {
  if (pNode.component) {
    pNode = pNode.component._pNode
  }
  const newChildren = pNode.children.map(child => {
    if ("text" in child) {
      return child
    } else {
      return toLatestPNode(child)
    }
  })

  return {
    sel: pNode.sel,
    data: { attrs: { ...pNode.data.attrs } },
    children: newChildren,
  }
}

function unmountChildren(
  component: Component<any, any>,
  root: ConnectedRoot | DisconnectedRoot,
): void {
  Object.keys(component._childMap).forEach(key => {
    const children = component._childMap[key]!
    children.forEach((child: any) => {
      if (child instanceof Component) {
        // Don't wait for this; unmounting is an asynchronous event.
        void child._triggerUnmount(
          root.connected ? root.allComponentsMap : null,
        )
      }
    })
  })
}

function unalias(id: string, root: ConnectedRoot): string {
  let alias = root.aliases[id]
  while (alias) {
    id = alias
    alias = root.aliases[id]
  }
  return id
}

async function cleanUpWebSocketState(wsState: WebSocketState): Promise<void> {
  const promises = wsState.roots.map(async root => {
    const stateTree = makeStateTree(root.component, true)
    await Purview.reloadOptions.saveStateTree(root.component._id, stateTree)
    await root.component._triggerUnmount(root.allComponentsMap)
  })
  if (wsState.hasCSS) {
    const cssPromise = Purview.reloadOptions.saveCSSState(
      wsState.cssState.id,
      wsState.cssState,
    )
    promises.push(cssPromise)
  }
  await Promise.all(promises)
}

const globalStateTrees: Record<string, StateTree | undefined> = {}
const globalCSSState: Record<string, CSSState | undefined> = {}
const DELETE_INTERVAL = 60 * 1000 // 60 seconds

namespace Purview {
  export function createElem(
    nodeName: string | ComponentConstructor<any, any>,
    attributes:
      | (JSXInternal.InputHTMLAttributes &
          JSXInternal.TextareaHTMLAttributes &
          JSXInternal.OptionHTMLAttributes)
      | null,
    ...children: NestedArray<JSXInternal.Child>
  ): JSXInternal.Element {
    attributes = attributes || {}

    const hasSelected =
      (nodeName === "option" && attributes.selected !== undefined) ||
      (nodeName === "select" && containsControlledOption(children))

    const isValueInput =
      (nodeName === "input" &&
        (!attributes.type || attributes.type === "text")) ||
      nodeName === "textarea"
    const hasValue = isValueInput && attributes.value !== undefined

    const isCheckedInput =
      nodeName === "input" &&
      (attributes.type === "checkbox" || attributes.type === "radio")
    const hasChecked = isCheckedInput && attributes.checked !== undefined

    if (hasSelected || hasValue || hasChecked) {
      ;(attributes as any)["data-controlled"] = true
    }

    if (
      isValueInput &&
      attributes.defaultValue !== undefined &&
      attributes.value === undefined
    ) {
      attributes.value = attributes.defaultValue
      delete attributes.defaultValue
    }

    // Must come after the defaultValue case is handled above. This ensures the
    // defaultValue is properly written to the children.
    if (nodeName === "textarea" && attributes.value !== undefined) {
      children = [attributes.value]
      delete attributes.value
    }

    if (
      isCheckedInput &&
      attributes.defaultChecked !== undefined &&
      attributes.checked === undefined
    ) {
      attributes.checked = attributes.defaultChecked
      delete attributes.defaultChecked
    }

    if (
      nodeName === "option" &&
      attributes.defaultSelected !== undefined &&
      attributes.selected === undefined
    ) {
      attributes.selected = attributes.defaultSelected
      delete attributes.defaultSelected
    }

    // For intrinsic elements, change special attributes to data-* equivalents and
    // remove falsy attributes.
    if (typeof nodeName === "string") {
      if (attributes.key !== undefined) {
        ;(attributes as any)["data-key"] = attributes.key
        delete attributes.key
      }

      if (attributes.ignoreChildren) {
        ;(attributes as any)["data-ignore-children"] = true
        delete attributes.ignoreChildren
      }

      Object.keys(attributes).forEach(key => {
        const value = (attributes as any)[key]
        if (value === null || value === undefined || value === false) {
          delete (attributes as any)[key]
        }
      })
    }

    if (children.length === 1) {
      return { nodeName, attributes, children: children[0] }
    } else {
      return { nodeName, attributes, children }
    }
  }
  export function handleWebSocket(
    server: http.Server,
    options: WebSocketOptions,
  ): WebSocket.Server {
    const wsServer = new WebSocket.Server({
      server,
      verifyClient(info: { origin: string; secure: boolean }): boolean {
        return options.origin === null || info.origin === options.origin
      },
    })

    wsServer.on("connection", (ws, req) => {
      if (req.method !== "GET") {
        throw new Error("Only GET requests are supported")
      }

      const wsStateBase: WebSocketState = {
        ws,
        roots: [] as ConnectedRoot[],
        connectionState: null,
        mounted: false,
        closing: false,
        seenEventNames: new Set(),
        hasCSS: false,
      }
      // wsStateBase is narrowed here to WebSocketStateNoCSS. This can be
      // problematic in the handlers below because it may have changed to
      // WebSocketStateHasCSS via the connect message. To avoid this, explicitly
      // widen the type here.
      const wsState = wsStateBase as WebSocketState

      ws.on("message", async data => {
        if (data === "ping") {
          ws.send("pong")
          return
        }

        const parsed = tryParseJSON(data.toString())
        const decoded = clientMessageValidator.decode(parsed)
        if (decoded.isRight()) {
          await handleMessage(decoded.value, wsState, req, server)
        }
      })

      ws.on("close", async () => {
        wsState.closing = true
        // Because both the "close" and "connect" events are async, we check if
        // `connectionState` is set to "connected" because it could be the case
        // that the "close" event fires just after the "connect" event (e.g., on
        // page refresh), and the "close" event will see that the `wsState.roots`
        // is an empty array due to the "connect" event still being in progress.
        // This would result in an incomplete clean up of the previous
        // connection's state. Hence, we return early, set the `closing` flag, and
        // let the "connect" event clean up the existing state by signaling with
        // `closing`.
        if (wsState.connectionState !== "connected") {
          return
        }

        await cleanUpWebSocketState(wsState)
        wsState.closing = false
      })
    })

    // Send pings periodically and terminate if no pong.
    const interval = setInterval(
      () => pingClients(wsServer, WS_PONG_TIMEOUT),
      WS_PING_INTERVAL,
    )
    wsServer.on("close", () => clearInterval(interval))

    server.on("close", () => wsServer.close())
    return wsServer
  }

  export async function render(
    jsx: JSXInternal.Element,
    req: http.IncomingMessage,
    options: RenderOptions = {},
  ): Promise<string> {
    const onError = options.onError ?? null

    if (!isComponentElem(jsx)) {
      throw new Error("Root element must be a Purview.Component")
    }

    const purviewState = req.purviewState
    let idStateTree: IDStateTree | undefined
    if (purviewState) {
      idStateTree = purviewState.idStateTrees.find(
        ist => ist.stateTree.name === jsx.nodeName.getUniqueName(),
      )
    }

    const stateTree = idStateTree && idStateTree.stateTree
    return await withComponent(jsx, stateTree, async component => {
      if (!component) {
        throw new Error("Expected non-null component")
      }

      let onUnseenError: ErrorHandler | null = null
      if (onError) {
        onUnseenError = error => {
          if (typeof error !== "object" || error === null) {
            onError(error)
            return
          }

          if (!seenErrors.has(error)) {
            seenErrors.add(error)
            onError(error)
          }
        }
      }

      let root: ConnectedRoot | DisconnectedRoot
      if (purviewState) {
        // This is the request from the websocket connection.
        component._id = idStateTree!.id
        root = {
          connected: true,
          component,
          wsState: purviewState.wsState,
          eventNames: new Set(),
          aliases: {},
          allComponentsMap: { [component._id]: component },
          onError: onUnseenError,
        }
        purviewState.roots = purviewState.roots || []
        purviewState.roots.push(root)
      } else {
        // This is the initial render.
        req.purviewCSSState = req.purviewCSSState ?? {
          id: nanoid(),
          atomicCSS: {},
          cssRules: [],
          nextRuleIndex: 0,
        }
        if (req.purviewCSSRendered) {
          throw new Error(RENDER_CSS_ORDERING_ERROR)
        }
        root = {
          connected: false,
          cssState: req.purviewCSSState,
          onError: onUnseenError,
        }
      }

      const pNode = await renderComponent(component, component._id, root)
      if (!pNode) {
        throw new Error("Expected non-null node")
      }

      if (purviewState) {
        return ""
      } else {
        await reloadOptions.saveStateTree(
          component._id,
          makeStateTree(component, false),
        )
        return toHTML(pNode)
      }
    })
  }

  export async function renderCSS(req: http.IncomingMessage): Promise<string> {
    const cssState = req.purviewCSSState
    if (!cssState) {
      req.purviewCSSRendered = true
      return ""
    }

    const { id, cssRules } = cssState
    const textPNode = createTextPNode(cssRules.join("\n"))
    const pNode = createPNode(
      "style",
      { id: STYLE_TAG_ID, "data-css-state-id": id },
      [textPNode],
    )

    cssState.nextRuleIndex = cssRules.length
    await reloadOptions.saveCSSState(id, cssState)
    req.purviewCSSRendered = true
    return toHTML(pNode)
  }
  export import JSX = JSXInternal

  export const reloadOptions = {
    async saveStateTree(id: string, tree: StateTree): Promise<void> {
      globalStateTrees[id] = tree
      if (process.env.NODE_ENV !== "test") {
        setTimeout(() => this.deleteStateTree(id), DELETE_INTERVAL)
      }
    },

    async getStateTree(id: string): Promise<StateTree | null> {
      return globalStateTrees[id] ?? null
    },

    async deleteStateTree(id: string): Promise<void> {
      delete globalStateTrees[id]
    },

    async saveCSSState(id: string, cssState: CSSState): Promise<void> {
      globalCSSState[id] = cssState
      if (process.env.NODE_ENV !== "test") {
        setTimeout(() => this.deleteCSSState(id), DELETE_INTERVAL)
      }
    },

    async getCSSState(id: string): Promise<CSSState | null> {
      return globalCSSState[id] ?? null
    },

    async deleteCSSState(id: string): Promise<void> {
      delete globalCSSState[id]
    },
  }
  export const scriptPath = pathLib.resolve(
    __dirname,
    "..",
    "dist",
    "bundle",
    "browser.js",
  )
  // tslint:disable-next-line
  export abstract class Component<P, S> extends InternalComponent<P, S> {}
}

Purview.Component = Component

export default Purview

export { Component }

// Export relevant types.
export {
  InputEvent,
  ChangeEvent,
  SubmitEvent,
  KeyEvent,
  PurviewEvent,
} from "./types/ws"
export { css, styledTag, CSS } from "./css"
export { JSXInternal as JSX }
