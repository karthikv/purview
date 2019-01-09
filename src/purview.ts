import * as http from "http"
import * as pathLib from "path"
import * as fs from "fs"
import * as WebSocket from "ws"
import nanoid = require("nanoid")
import * as t from "io-ts"
import { JSDOM } from "jsdom"

import Component, { ComponentConstructor, ChildMap } from "./component"
import {
  tryParseJSON,
  mapNested,
  isEventAttr,
  toEventName,
  CAPTURE_TEXT,
  findNested,
  eachNested,
  concretize,
} from "./helpers"
import { ServerMessage, ClientMessage, EventCallback } from "./types/ws"
import {
  makeInputEventValidator,
  makeChangeEventValidator,
  submitEventValidator,
  keyEventValidator,
  clientMessageValidator,
} from "./validators"
import { VNode, VNodeData } from "snabbdom/vnode"
import { Attrs } from "snabbdom/modules/attributes"

export interface WebSocketOptions {
  origin: string | null
}

interface WebSocketState {
  ws: WebSocket
  roots: Root[]
  connected: boolean
  seenEventNames: Set<string>
}

interface Handler {
  eventName: string
  callback: EventCallback
  possibleValues?: string[]
  validator?: t.Type<any, any, any>
}

interface Root {
  component: Component<any, any>
  wsState: WebSocketState
  eventNames: Set<string>
  handlers: { [key: string]: Handler }
  aliases: { [key: string]: string }
}

export type PNode = PNodeRegular | PNodeText

interface PNodeRegular extends PNodeBase {
  sel: string
  text: undefined
}

interface PNodeText extends PNodeBase {
  sel: undefined
  text: string
}

interface PNodeBase extends VNode {
  data: VNodeData
  children: PNode[]
  component?: Component<any, any>
}

export interface StateTree {
  name: string
  value: Record<string, any>
  childMap: ChildMap<StateTree>
}

interface IDStateTree {
  id: string
  stateTree: StateTree
}

declare module "http" {
  interface IncomingMessage {
    purviewState?: {
      wsState: WebSocketState
      idStateTrees: IDStateTree[]
      roots?: Root[]
    }
  }
}

const INPUT_TYPE_VALIDATOR: { [key: string]: t.Type<any, any, any> } = {
  checkbox: t.boolean,
  number: t.number,
}

const { document } = new JSDOM().window
const cachedEventIDs = new WeakMap()

export function createElem(
  nodeName: string | ComponentConstructor<any, any>,
  attributes:
    | JSX.InputHTMLAttributes<any> & JSX.TextareaHTMLAttributes<any>
    | null,
  ...children: NestedArray<JSX.Child>
): JSX.Element {
  attributes = attributes || {}

  const hasForceSelected =
    nodeName === "select" &&
    findNested(
      children,
      c => isJSXOption(c) && c.attributes.hasOwnProperty("forceSelected"),
    )

  const hasForceValue =
    ((nodeName === "input" &&
      (!("type" in attributes) || attributes.type === "text")) ||
      nodeName === "textarea") &&
    attributes.hasOwnProperty("forceValue")

  const hasForceChecked =
    nodeName === "input" &&
    (attributes.type === "checkbox" || attributes.type === "radio") &&
    attributes.hasOwnProperty("forceChecked")

  // In Firefox, if you enter some data into a text input, and refresh, the
  // value from the previous page will be retained, even if the input has
  // a value attribute. We don't want this behavior if we're forcing a value, so
  // we set autocomplete to off. The same applies to selects and textareas.
  if (hasForceSelected || hasForceValue || hasForceChecked) {
    attributes.autocomplete = "off"
    ;(attributes as any)["data-controlled"] = true
  }

  if (hasForceSelected) {
    eachNested(children, child => {
      if (
        isJSXOption(child) &&
        child.attributes.hasOwnProperty("forceSelected")
      ) {
        child.attributes.selected = child.attributes.forceSelected
        delete child.attributes.forceSelected
      }
    })
  }

  // Must do this before the forceValue logic below.
  if (nodeName === "textarea" && attributes.hasOwnProperty("value")) {
    children = [attributes.value as string]
    delete attributes.value
  }

  if (hasForceValue) {
    if (nodeName === "textarea") {
      children = [attributes.forceValue as string]
      delete attributes.forceValue
    } else {
      attributes.value = attributes.forceValue
      delete attributes.forceValue
    }
  }

  if (hasForceChecked) {
    attributes.checked = attributes.forceChecked
    delete attributes.forceChecked
  }

  // For intrinsic elements, change special attributes to data-* equivalents and
  // remove falsy attributes.
  if (typeof nodeName === "string") {
    if (attributes.key) {
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

function isJSXOption(
  child: JSX.Child,
): child is JSX.Element<JSX.OptionHTMLAttributes<any>> {
  return typeof child === "object" && (child as any).nodeName === "option"
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

    const wsState: WebSocketState = {
      ws,
      roots: [] as Root[],
      connected: false,
      seenEventNames: new Set(),
    }

    ws.on("message", data => {
      const parsed = tryParseJSON(data.toString())
      const decoded = clientMessageValidator.decode(parsed)
      if (decoded.isRight()) {
        handleMessage(decoded.value, wsState, req, server)
      }
    })

    ws.on("close", async () => {
      const promises = wsState.roots.map(async root => {
        const stateTree = makeStateTree(root.component)
        await reloadOptions.saveStateTree(root.component._id, stateTree)
        root.component._triggerUnmount()
      })
      await Promise.all(promises)
    })
  })

  return wsServer
}

function makeStateTree(component: Component<any, any>): StateTree {
  const childMap: ChildMap<StateTree> = {}
  Object.keys(component._childMap).forEach(key => {
    const children = component._childMap[key]
    childMap[key] = children.map(c => makeStateTree(c as Component<any, any>))
  })

  return {
    name: component.constructor.name,
    value: (component as any).state,
    childMap,
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
      if (wsState.connected) {
        break
      }
      wsState.connected = true

      const promises = message.rootIDs.map(async id => {
        return { id, stateTree: await reloadOptions.getStateTree(id) }
      })
      const idStateTrees = await Promise.all(promises)
      if (idStateTrees.some(ist => !ist.stateTree)) {
        wsState.ws.close()
        return
      }

      req.purviewState = {
        wsState,
        idStateTrees: idStateTrees as IDStateTree[],
      }

      const res = new http.ServerResponse(req)
      const nullStream = fs.createWriteStream("/dev/null")
      res.assignSocket(nullStream as any)
      server.emit("request", req, res)

      const roots = await new Promise<Root[] | undefined>(resolve => {
        res.on("finish", () => resolve(req.purviewState!.roots))
      })
      if (!roots) {
        throw new Error("Couldn't start WebSocket, found no components.")
      }

      roots.forEach(root => {
        root.wsState = wsState
        wsState.roots.push(root)
        root.component._triggerMount()
      })

      await Promise.all(
        message.rootIDs.map(id => reloadOptions.deleteStateTree(id)),
      )
      break
    }

    case "event": {
      const root = wsState.roots.find(r => r.component._id === message.rootID)
      if (!root) {
        break
      }

      const handler = root.handlers[message.eventID]
      if (!handler) {
        break
      }

      if (handler.validator) {
        const decoded = handler.validator.decode(message.event)
        if (decoded.isRight()) {
          handler.callback(decoded.value)
        }
      } else {
        handler.callback()
      }
      break
    }

    case "seenEventNames": {
      wsState.seenEventNames = new Set(message.seenEventNames)
      break
    }
  }
}

function sendMessage(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message))
  }
}

export async function render(
  jsx: JSX.Element,
  req: http.IncomingMessage,
): Promise<string> {
  if (!isComponentElem(jsx)) {
    throw new Error("Root element must be a Purview.Component")
  }

  const purviewState = req.purviewState
  let idStateTree: IDStateTree | undefined
  if (purviewState) {
    idStateTree = purviewState.idStateTrees.find(
      ist => ist.stateTree.name === jsx.nodeName.name,
    )
  }

  const stateTree = idStateTree && idStateTree.stateTree
  return await withComponent(jsx, stateTree, async component => {
    if (!component) {
      throw new Error("Expected non-null component")
    }

    let root: Root | null = null
    if (purviewState) {
      component._id = idStateTree!.id
      root = {
        component,
        wsState: purviewState.wsState,
        eventNames: new Set(),
        handlers: {},
        aliases: {},
      }
      purviewState.roots = purviewState.roots || []
      purviewState.roots.push(root)
    }

    const pNode = await renderComponent(component, component._id, root)
    if (!pNode) {
      throw new Error("Expected non-null node")
    }

    if (purviewState) {
      sendMessage(root!.wsState.ws, {
        type: "update",
        componentID: component._id,
        vNode: toLatestVNode(pNode),
        newEventNames: Array.from(root!.eventNames),
      })
    } else {
      await reloadOptions.saveStateTree(component._id, makeStateTree(component))
    }
    return concretize(pNode, document).outerHTML
  })
}

function isComponentElem(jsx: JSX.Element): jsx is JSX.ComponentElement {
  return (
    typeof jsx.nodeName === "function" &&
    jsx.nodeName.prototype &&
    jsx.nodeName.prototype._isPurviewComponent
  )
}

async function makeElem(
  jsx: JSX.Element,
  parent: Component<any, any>,
  rootID: string,
  root: Root | null,
  parentKey: string,
): Promise<PNode | null> {
  let key: string
  if (isComponentElem(jsx)) {
    key = `${parentKey}/${jsx.nodeName.name}`
    const cached = parent._childMap[key]
    const existing = cached ? cached.shift() : null

    if (!parent._newChildMap[key]) {
      parent._newChildMap[key] = []
    }

    // Retain the ordering of child elements by saving the index here.
    const index = parent._newChildMap[key].length
    parent._newChildMap[key].push(null)

    return await withComponent(jsx, existing, async component => {
      if (!component) {
        return null
      }

      parent._newChildMap[key][index] = component
      const pNode = await renderComponent(component, rootID, root)
      const wsState = root && root.wsState

      if (!existing && wsState && wsState.connected) {
        // Child components have already been mounted recursively. We don't call
        // _triggerMount() because that would recursively call componentDidMount()
        // on children again.
        component.componentDidMount()
      }
      return pNode
    })
  }

  if (typeof jsx.nodeName !== "string") {
    throw new Error(
      `Invalid JSX node: ${
        jsx.nodeName
      }. Nodes must be classes that extend Purview.Component or HTML tag names.`,
    )
  }

  const { nodeName, attributes } = jsx
  key = `${parentKey}/${nodeName}`

  const attrs: Attrs = {}
  let changeHandler: Handler | undefined

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

    if (root) {
      root.handlers[eventID] = {
        eventName,
        callback,
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
            const type = (attributes as JSX.InputHTMLAttributes<any>)
              .type as string
            validator = makeValidator(INPUT_TYPE_VALIDATOR[type] || t.string)
          } else if (nodeName === "select") {
            const multiple = (attributes as JSX.SelectHTMLAttributes<any>)
              .multiple
            validator = makeValidator(multiple ? t.array(t.string) : t.string)
          } else {
            // Could be a parent of an input/select, or a custom element. Leave
            // validation up to the user.
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
      root.handlers[eventID].validator = validator

      if (nodeName === "select" && eventName === "change") {
        changeHandler = root.handlers[eventID]
      }
    }

    if (attr.indexOf(CAPTURE_TEXT) !== -1) {
      attrs[`data-${eventName}-capture`] = eventID
    } else {
      attrs[`data-${eventName}`] = eventID
    }
  })

  let { children } = jsx
  if (!(children instanceof Array)) {
    children = [children]
  }
  const promises = mapNested(children, async child => {
    if (child === null || child === undefined || child === false) {
      return null
    }

    if (typeof child === "object") {
      return await makeElem(child, parent, rootID, root, key)
    } else {
      return createTextPNode(String(child))
    }
  })

  const vChildren: PNode[] = []
  ;(await Promise.all(promises)).forEach(child => {
    if (child) {
      vChildren.push(child)
    }
  })

  if (changeHandler) {
    const possibleValues: string[] = []
    vChildren.forEach(({ data }) => {
      if (data && data.attrs && typeof data.attrs.value === "string") {
        possibleValues.push(data.attrs.value)
      }
    })
    changeHandler.possibleValues = possibleValues
  }

  return createPNode(nodeName, attrs, vChildren)
}

async function withComponent<T>(
  jsx: JSX.ComponentElement,
  existing: Component<any, any> | StateTree | null | undefined,
  callback: (component: Component<any, any> | null) => T,
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

    if (existing instanceof Component) {
      component._setProps(props)
    } else if (existing) {
      component._childMap = existing.childMap
      await component._initState(existing.value)
    } else {
      await component._initState()
    }
    return callback(component)
  })
}

async function renderComponent(
  component: Component<any, any>,
  rootID: string,
  root: Root | null,
): Promise<PNode | null> {
  component._newChildMap = {}

  const pNode = await makeElem(component.render(), component, rootID, root, "")
  if (!pNode) {
    return null
  }

  pNode.component = component
  component._pNode = pNode
  if (component._id === rootID) {
    pNode.data.attrs!["data-root"] = true
  }

  unmountChildren(component)

  const newChildMap: ChildMap<Component<any, any>> = {}
  Object.keys(component._newChildMap).forEach(key => {
    newChildMap[key] = component._newChildMap[key].filter(
      c => c !== null,
    ) as Array<Component<any, any>>
  })
  component._childMap = newChildMap

  if (root && !component._handleUpdate) {
    component._handleUpdate = async () => {
      const newPNode = await renderComponent(component, rootID, root)
      if (!newPNode) {
        return
      }

      const newEventNames = new Set()
      root.eventNames.forEach(name => {
        if (!root.wsState.seenEventNames.has(name)) {
          newEventNames.add(name)
        }
      })

      sendMessage(root.wsState.ws, {
        type: "update",
        componentID: unalias(component._id, root),
        vNode: toLatestVNode(newPNode),
        newEventNames: Array.from(newEventNames),
      })
    }
  }

  // If this component directly nests another component, a component ID will
  // already exist on elem. In this case, we override the component ID in the
  // data-component-id attribute, but keep track of the mapping in our aliases
  // map. This lets us send the proper ID in update messages to the client (see
  // the _handleUpdate function above).
  //
  // It's possible for componentID to equal component._id if this is the second
  // time we're rendering a nested component, since the nested component will
  // reflect the parent component's ID due to the unaliasing further below. We
  // don't add an alias in this case to avoid cyles.
  const componentID = pNode.data.attrs!["data-component-id"] as string
  const id = component._id
  if (root && componentID && componentID !== id) {
    root.aliases[componentID] = id
  }

  // We may re-render a directly nested component without re-rendering the
  // parent. In this case, we have to unalias to use the parent component's ID.
  const unaliasedID = root ? unalias(id, root) : id
  pNode.data.attrs!["data-component-id"] = unaliasedID
  return pNode
}

function createPNode(sel: string, attrs: Attrs, children: PNode[]): PNode {
  return {
    sel,
    data: { attrs },
    children,
    text: undefined,
    elm: undefined,
    key: undefined,
  }
}

function createTextPNode(text: string): PNode {
  return {
    sel: undefined,
    data: {},
    children: [],
    text,
    elm: undefined,
    key: undefined,
  }
}

function toLatestVNode(pNode: PNode): VNode {
  if (pNode.component) {
    pNode = pNode.component._pNode
  }
  const newChildren = pNode.children.map(child => toLatestVNode(child))

  return {
    sel: pNode.sel,
    data: { attrs: { ...pNode.data.attrs } },
    children: newChildren,
    text: pNode.text,
    elm: undefined,
    key: undefined,
  }
}

function unmountChildren(component: Component<any, any>): void {
  Object.keys(component._childMap).forEach(key => {
    const children = component._childMap[key]
    children.forEach(child => {
      if (child instanceof Component) {
        child._triggerUnmount()
      }
    })
  })
}

function unalias(id: string, root: Root): string {
  while (root.aliases[id]) {
    id = root.aliases[id]
  }
  return id
}

const globalStateTrees: Record<string, StateTree> = {}
export const reloadOptions = {
  async saveStateTree(id: string, tree: StateTree): Promise<void> {
    globalStateTrees[id] = tree
    if (process.env.NODE_ENV !== "test") {
      setTimeout(() => this.deleteStateTree(id), 60 * 1000)
    }
  },

  async getStateTree(id: string): Promise<StateTree | null> {
    return globalStateTrees[id]
  },

  async deleteStateTree(id: string): Promise<void> {
    delete globalStateTrees[id]
  },
}

export { Component }
export const scriptPath = pathLib.resolve(
  __dirname,
  "..",
  "dist",
  "bundle",
  "browser.js",
)

// Export all values above on the default object as well.
export default {
  createElem,
  handleWebSocket,
  render,
  Component,
  scriptPath,
  reloadOptions,
}

// Export relevant types.
export {
  InputEvent,
  ChangeEvent,
  SubmitEvent,
  KeyEvent,
  PurviewEvent,
} from "./types/ws"
export * from "./types/jsx"
