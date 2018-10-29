import * as http from "http"
import * as WebSocket from "ws"
import nanoid = require("nanoid")
import { JSDOM } from "jsdom"

import Component, { ComponentConstructor } from "./component"
import { tryParseJSON } from "./helpers"

interface Root {
  component: Component<any, any>
  mounted: boolean
  ws?: WebSocket
  handlers: { [key: string]: () => void }
  aliases: { [key: string]: string }
}

const { document } = new JSDOM().window

const roots: { [key: string]: Root } = {}
const cachedEventIDs = new WeakMap()

export function createElem(
  nodeName: string | ComponentConstructor<any, any>,
  attributes: JSX.IntrinsicAttributes,
  ...children: JSX.Child[]
): JSX.Element {
  attributes = attributes || {}

  // In Firefox, if you visit a website, enter some data into a text input,
  // and refresh, the value from the previous page will be retained, even if
  // the input has a value attribute. We don't want this behavior, so we set
  // autocomplete to off. The same applies to selects and textareas.
  if (
    (nodeName === "select" &&
      children.find(c => isJSXElem(c) && (c.attributes as any).selected)) ||
    (nodeName === "input" &&
      (attributes.hasOwnProperty("value") ||
        attributes.hasOwnProperty("checked"))) ||
    (nodeName === "textarea" && children.length > 0)
  ) {
    attributes = Object.assign({ autocomplete: "off" }, attributes)
  }

  return { nodeName, attributes, children }
}

function isJSXElem(child: JSX.Child): child is JSX.Element {
  return child && (child as any).attributes
}

export function handleWebSocket(server: http.Server): void {
  const wsServer = new WebSocket.Server({ server })
  wsServer.on("connection", ws => {
    const wsState = { roots: [] as Root[], connected: false }

    ws.on("message", data => {
      // TODO: validation
      const message = tryParseJSON<ClientMessage>(data.toString())
      handleMessage(message, ws, wsState)
    })

    ws.on("close", () => {
      wsState.roots.forEach(root => {
        root.component._triggerUnmount()
        delete roots[root.component._id]
      })
    })
  })
}

function handleMessage(
  message: ClientMessage,
  ws: WebSocket,
  wsState: { roots: Root[]; connected: boolean },
): void {
  switch (message.type) {
    case "connect": {
      if (wsState.connected) {
        return
      }
      wsState.connected = true

      message.rootIDs.forEach(id => {
        const root = roots[id]
        if (!root) {
          return
        }

        root.ws = ws
        root.component._triggerMount()
        root.mounted = true
        wsState.roots.push(root)
      })

      // TODO: listen for this on client side
      sendMessage(ws, { type: "connected" })
      break
    }

    case "event": {
      const root = wsState.roots.find(r => r.component._id === message.rootID)
      if (root) {
        root.handlers[message.eventID]()
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

export function render(jsxElem: JSX.Element): string {
  if (!isComponentElem(jsxElem)) {
    throw new Error("Root element must be a Purview.Component")
  }

  const component = makeComponent(jsxElem)
  roots[component._id] = {
    component,
    mounted: false,
    handlers: {},
    aliases: {},
  }
  return makeComponentElem(component, component._id).outerHTML
}

function isComponentElem(
  jsxElem: JSX.Element,
): jsxElem is JSX.ComponentElement {
  // TODO: disambiguate between pure stateless func
  return typeof jsxElem.nodeName === "function"
}

function makeElem(
  jsxElem: JSX.Element,
  parent: Component<any, any>,
  rootID: string,
  parentKey: string,
): Element {
  let key: string
  if (isComponentElem(jsxElem)) {
    key = `${parentKey}/${jsxElem.nodeName._typeID}`
    const cached = parent._childMap[key]
    const existing = cached ? cached.shift() : null
    const component = makeComponent(jsxElem, existing)

    if (!parent._newChildMap[key]) {
      parent._newChildMap[key] = []
    }
    parent._newChildMap[key].push(component)

    const finalElem = makeComponentElem(component, rootID)
    if (!existing && roots[rootID] && roots[rootID].mounted) {
      // Child components have already been mounted recursively. We don't call
      // _triggerMount() because that would recursively call componentDidMount()
      // on children again.
      component.componentDidMount()
    }
    return finalElem
  }

  const { nodeName, attributes, children } = jsxElem
  key = `${parentKey}/${nodeName}`
  const elem = document.createElement(nodeName as string)

  for (const attr in attributes) {
    if (attributes.hasOwnProperty(attr)) {
      if (attr === "onClick") {
        const handler = attributes[attr] as () => {}
        let eventID = cachedEventIDs.get(handler)

        if (!eventID) {
          eventID = nanoid()
          cachedEventIDs.set(handler, eventID)
          if (roots[rootID]) {
            roots[rootID].handlers[eventID] = handler
          }
        }

        elem.setAttribute(`data-${attr}`, eventID)
      } else {
        const value = (attributes as any)[attr]
        elem.setAttribute(attr, value)
      }
    }
  }

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

  return elem
}

function eachNested<T>(
  array: JSX.NestedArray<T>,
  callback: (elem: T) => void,
): void {
  array.forEach(elem => {
    if (elem instanceof Array) {
      eachNested(elem, callback)
    } else {
      callback(elem)
    }
  })
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
      if (root && root.ws) {
        const newElem = makeComponentElem(component, rootID)
        sendMessage(root.ws, {
          type: "update",
          componentID: unalias(component._id, root),
          html: newElem.outerHTML,
        })
      }
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

export default {
  createElem,
  handleWebSocket,
  render,
  Component,
}
