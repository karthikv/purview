import * as http from "http"
import * as pathLib from "path"
import * as WebSocket from "ws"
import nanoid = require("nanoid")
import { JSDOM } from "jsdom"
import * as t from "io-ts"

import Component, {
  StatelessComponent,
  ComponentConstructor,
} from "./component"
import {
  tryParseJSON,
  eachNested,
  isEventAttr,
  toEventName,
  CAPTURE_TEXT,
  isInput,
  isSelect,
} from "./helpers"
import { ServerMessage, ClientMessage, EventCallback } from "./types/ws"
import {
  makeInputEventValidator,
  makeChangeEventValidator,
  submitEventValidator,
  keyEventValidator,
  clientMessageValidator,
} from "./validators"

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
  dirtyComponents: Set<Component<any, any>>
  wsState?: WebSocketState
  eventNames: Set<string>
  handlers: { [key: string]: Handler }
  aliases: { [key: string]: string }
}

const INPUT_TYPE_VALIDATOR: { [key: string]: t.Type<any, any, any> } = {
  checkbox: t.boolean,
  number: t.number,
}

const { document } = new JSDOM().window

const roots: { [key: string]: Root } = {}
const cachedEventIDs = new WeakMap()

export function createElem(
  nodeName: string | ComponentConstructor<any, any>,
  attributes:
    | JSX.InputHTMLAttributes<any> & JSX.TextareaHTMLAttributes<any>
    | null,
  ...children: JSX.Child[]
): JSX.Element {
  attributes = attributes || {}

  const hasForceSelected =
    nodeName === "select" &&
    children.find(
      c => isJSXOption(c) && c.attributes.hasOwnProperty("forceSelected"),
    )

  const hasForceValue =
    ((nodeName === "input" && attributes.type === "text") ||
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
  }

  if (hasForceSelected) {
    children.forEach(c => {
      if (isJSXOption(c) && c.attributes.hasOwnProperty("forceSelected")) {
        c.attributes.selected = c.attributes.forceSelected
        delete c.attributes.forceSelected
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

  Object.keys(attributes).forEach(key => {
    const value = (attributes as any)[key]
    if (value === null || value === undefined || value === false) {
      delete (attributes as any)[key]
    }
  })

  return { nodeName, attributes, children }
}

function isJSXOption(
  child: JSX.Child,
): child is JSX.Element<JSX.OptionHTMLAttributes<any>> {
  return typeof child === "object" && (child as any).nodeName === "option"
}

export function handleWebSocket(server: http.Server): void {
  const wsServer = new WebSocket.Server({ server })
  wsServer.on("connection", ws => {
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
        handleMessage(decoded.value, wsState)
      }
    })

    ws.on("close", () => {
      wsState.roots.forEach(root => {
        root.component._triggerUnmount()
        delete roots[root.component._id]
      })
    })
  })
}

function handleMessage(message: ClientMessage, wsState: WebSocketState): void {
  switch (message.type) {
    case "connect": {
      if (wsState.connected) {
        break
      }
      wsState.connected = true

      const newEventNames = new Set()
      message.rootIDs.forEach(id => {
        const root = roots[id]
        if (!root) {
          return
        }

        root.wsState = wsState
        root.component._triggerMount()

        wsState.roots.push(root)
        root.eventNames.forEach(name => {
          if (!wsState.seenEventNames.has(name)) {
            newEventNames.add(name)
          }
        })

        root.dirtyComponents.forEach(c => c._handleUpdate())
      })

      sendMessage(wsState.ws, {
        type: "connected",
        newEventNames: Array.from(newEventNames),
      })
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

export function render(jsx: JSX.Element): string {
  if (!isComponentElem(jsx)) {
    throw new Error("Root element must be a Purview.Component")
  }

  const component = makeComponent(jsx)
  roots[component._id] = {
    component,
    dirtyComponents: new Set(),
    handlers: {},
    eventNames: new Set(),
    aliases: {},
  }
  return makeComponentElem(component, component._id).outerHTML
}

function isComponentElem(jsx: JSX.Element): jsx is JSX.ComponentElement {
  return (
    typeof jsx.nodeName === "function" &&
    jsx.nodeName.prototype &&
    jsx.nodeName.prototype._isPurviewComponent
  )
}

function isStatelessElem(jsx: JSX.Element): jsx is JSX.StatelessElement {
  return typeof jsx.nodeName === "function" && !isComponentElem(jsx)
}

function makeElem(
  jsx: JSX.Element,
  parent: Component<any, any>,
  rootID: string,
  parentKey: string,
): Element {
  let key: string
  if (isComponentElem(jsx)) {
    key = `${parentKey}/${jsx.nodeName._typeID}`
    const cached = parent._childMap[key]
    const existing = cached ? cached.shift() : null
    const component = makeComponent(jsx, existing)

    if (!parent._newChildMap[key]) {
      parent._newChildMap[key] = []
    }
    parent._newChildMap[key].push(component)

    const finalElem = makeComponentElem(component, rootID)
    if (!existing && roots[rootID] && roots[rootID].wsState) {
      // Child components have already been mounted recursively. We don't call
      // _triggerMount() because that would recursively call componentDidMount()
      // on children again.
      component.componentDidMount()
    }
    return finalElem
  }

  let { nodeName, attributes, children } = jsx
  if (isStatelessElem(jsx)) {
    ;({ nodeName, attributes, children } = jsx.nodeName(
      Object.assign({ children }, attributes),
    ))
  }

  key = `${parentKey}/${nodeName}`

  const elem = document.createElement(nodeName as string)
  const root = roots[rootID]
  let changeHandler: Handler | undefined

  Object.keys(attributes).forEach(attr => {
    if (!isEventAttr(attr)) {
      elem.setAttribute(attr, (attributes as any)[attr])
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

          if (isInput(elem)) {
            const type = (attributes as JSX.InputHTMLAttributes<any>)
              .type as string
            validator = makeValidator(INPUT_TYPE_VALIDATOR[type] || t.string)
          } else if (isSelect(elem)) {
            const multiple = (attributes as JSX.SelectHTMLAttributes<any>)
              .multiple
            validator = makeValidator(multiple ? t.array(t.string) : t.string)
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
      elem.setAttribute(`data-${eventName}-capture`, eventID)
    } else {
      elem.setAttribute(`data-${eventName}`, eventID)
    }
  })

  if (children) {
    eachNested(children, child => {
      if (child === null) {
        return
      }

      let node: Node
      if (typeof child === "object") {
        node = makeElem(child, parent, rootID, key)
      } else {
        node = document.createTextNode(String(child))
      }
      elem.appendChild(node)
    })
  }

  if (changeHandler) {
    changeHandler.possibleValues = Array.from(
      (elem as HTMLSelectElement).options,
    ).map(option => option.value)
  }

  return elem
}

function makeComponent<P, S>(
  { nodeName, attributes, children }: JSX.ComponentElement,
  existing?: Component<any, any> | null,
): Component<P, S> {
  const props = Object.assign({ children }, attributes)
  if (existing) {
    existing._setProps(props as any)
    return existing
  }
  return new nodeName(props)
}

function makeComponentElem(
  component: Component<any, any>,
  rootID: string,
): Element {
  component._newChildMap = {}
  let elem: Element

  elem = makeElem(component.render(), component, rootID, "")
  if (component._id === rootID) {
    elem.setAttribute("data-root", "true")
  }

  unmountChildren(component)
  component._childMap = component._newChildMap

  if (!component._handleUpdate) {
    component._handleUpdate = () => {
      const root = roots[rootID]
      if (!root) {
        return
      }

      if (!root.wsState) {
        root.dirtyComponents.add(component)
        return
      }

      const newElem = makeComponentElem(component, rootID)
      const newEventNames = new Set()

      root.eventNames.forEach(name => {
        if (!(root.wsState as WebSocketState).seenEventNames.has(name)) {
          newEventNames.add(name)
        }
      })

      sendMessage(root.wsState.ws, {
        type: "update",
        componentID: unalias(component._id, root),
        html: newElem.outerHTML,
        newEventNames: Array.from(newEventNames),
      })
    }
  }

  // If this component directly nests another component, a component ID will
  // already exist on elem. In this case, we override the component ID in the
  // data-component-id attribute, but keep track of the mapping in our aliases
  // map. This lets us send the proper ID in update messages to the client (see
  // the _handleUpdate function above).
  const componentID = elem.getAttribute("data-component-id")
  if (componentID) {
    roots[rootID].aliases[componentID] = component._id
  }

  elem.setAttribute("data-component-id", component._id)
  return elem
}

function unmountChildren(component: Component<any, any>): void {
  Object.keys(component._childMap).forEach(key => {
    const children = component._childMap[key]
    children.forEach(child => child._triggerUnmount())
  })
}

function unalias(id: string, root: Root): string {
  while (root.aliases[id]) {
    id = root.aliases[id]
  }
  return id
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
}

// Export relevant types.
export { StatelessComponent }
export {
  InputEvent,
  ChangeEvent,
  SubmitEvent,
  KeyEvent,
  PurviewEvent,
} from "./types/ws"
