import * as http from "http"
import { EventEmitter } from "events"
import * as WebSocket from "ws"
import nanoid = require("nanoid")
import { JSDOM } from "jsdom"

import Component, { ComponentConstructor } from "./component"
import { tryParse } from "./helpers"

const { document } = new JSDOM().window

// TODO: typescript target in tsconfig.json

// TODO: clean up to avoid memory leaks
const broker = new EventEmitter()
const roots: { [key: string]: Component<any, any> } = {}

const eventIDs = new WeakMap()

export function createElement(
  nodeName: string | ComponentConstructor<any, any>,
  attributes: JSX.IntrinsicAttributes,
  ...children: JSX.Child[]
): JSX.Element {
  attributes = attributes || {}
  if (
    (nodeName === "select" &&
      children.find(c => hasAttributes(c) && (c.attributes as any).selected)) ||
    (nodeName === "input" &&
      (attributes.hasOwnProperty("value") ||
        attributes.hasOwnProperty("checked"))) ||
    (nodeName === "textarea" && children.length > 0)
  ) {
    attributes = Object.assign({ autocomplete: "off" }, attributes)
  }
  return { nodeName, attributes, children }
}

function hasAttributes(child: JSX.Child): child is JSX.Element {
  return child && (child as any).attributes
}

export function handleWebSocket(server: http.Server): void {
  const wsServer = new WebSocket.Server({ server })
  wsServer.on("connection", ws => {
    ws.on("message", data => {
      // TODO: validation
      const message = tryParse<ClientMessage>(data.toString())

      switch (message.type) {
        case "connect":
          message.rootIDs.forEach(id => {
            const root = roots[id]
            if (!root) {
              return
            }

            broker.on(`update-${id}`, (component: Component<any, any>) => {
              const elem = makeComponentElem(component, id)
              const update: UpdateMessage = {
                type: "update",
                componentID: component._id,
                html: elem.outerHTML,
              }
              ws.send(JSON.stringify(update))
            })
          })
          break

        case "event":
          broker.emit(message.eventID)
          break
      }
    })
  })
}

export function render(jsxElem: JSX.Element): string {
  if (!isComponentElem(jsxElem)) {
    throw new Error("Root element must be a Purview.Component")
  }

  const root = makeComponent(jsxElem)
  roots[root._id] = root
  return makeComponentElem(root, null).outerHTML
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
    return makeComponentElem(component, rootID)
  }

  const { nodeName, attributes, children } = jsxElem
  key = `${parentKey}/${nodeName}`
  const elem = document.createElement(nodeName as string)

  for (const attr in attributes) {
    if (attributes.hasOwnProperty(attr)) {
      if (attr === "onClick") {
        const handler = attributes[attr] as () => {}
        let eventID = eventIDs.get(handler)

        if (!eventID) {
          eventID = nanoid()
          eventIDs.set(handler, eventID)
          broker.on(eventID, handler)
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
  rootID: string | null,
): Element {
  component._newChildMap = {}
  let elem: Element

  if (rootID) {
    elem = makeElem(component.render(), component, rootID, "")
  } else {
    rootID = component._id
    elem = makeElem(component.render(), component, rootID, "")
    elem.setAttribute("data-root", "true")
  }

  component._childMap = component._newChildMap
  if (!component._handleUpdate) {
    component._handleUpdate = () => {
      broker.emit(`update-${rootID}`, component)
    }
  }

  elem.setAttribute("data-component-id", component._id)
  return elem
}

export { Component }

export default {
  createElement,
  handleWebSocket,
  render,
  Component,
}
