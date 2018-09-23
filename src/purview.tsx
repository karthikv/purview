import * as http from "http"
import * as WebSocket from "ws"
import { v4 as makeUUID } from "uuid"
import { JSDOM } from "jsdom"

import Component, { ComponentConstructor } from "./component"
import { tryParse } from "./helpers"
import Broker from "./broker"

const { document } = new JSDOM().window

// TODO: clean up to avoid memory leaks
const roots: { [key: string]: Component<any, any> } = {}

export function createElement(
  nodeName: string | ComponentConstructor<any, any>,
  attributes: JSX.IntrinsicAttributes,
  ...children: JSX.Child[]
): JSX.Element {
  return { nodeName, attributes, children }
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

            Broker.on(`update-${id}`, (component: Component<any, any>) => {
              const elem = makeComponentElem(component, id)
              const update: UpdateMessage = {
                type: "update",
                componentID: component.id,
                html: elem.outerHTML,
              }
              ws.send(JSON.stringify(update))
            })
          })
          break

        case "event":
          Broker.emit(message.eventID)
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
  roots[root.id] = root
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
): Element {
  if (isComponentElem(jsxElem)) {
    const component = makeComponent(jsxElem)
    return makeComponentElem(component, rootID)
  }

  const { nodeName, attributes, children } = jsxElem
  const elem = document.createElement(nodeName as string)

  for (const key in attributes) {
    if (attributes.hasOwnProperty(key)) {
      if (key === "onClick") {
        const eventID = makeUUID()
        Broker.on(eventID, attributes[key] as any)
        elem.setAttribute(`data-${key}`, eventID)
      } else {
        const value = (attributes as any)[key]
        elem.setAttribute(key, value)
      }
    }
  }

  children.forEach(child => {
    if (child === null) {
      return
    }

    let node: Node
    if (typeof child === "object") {
      node = makeElem(child, parent, rootID)
    } else {
      node = document.createTextNode(String(child))
    }
    elem.appendChild(node)
  })

  return elem
}

function makeComponent({
  nodeName,
  attributes,
  children,
}: JSX.ComponentElement): Component<any, any> {
  const args = Object.assign({ children }, attributes)
  return new nodeName(args)
}

function makeComponentElem(
  component: Component<any, any>,
  rootID: string | null,
): Element {
  let elem: Element
  if (rootID) {
    elem = makeElem(component.render(), component, rootID)
  } else {
    rootID = component.id
    elem = makeElem(component.render(), component, rootID)
    elem.setAttribute("data-root", "true")
  }

  component.on("update", () => {
    Broker.emit(`update-${rootID}`, component)
  })
  elem.setAttribute("data-component-id", component.id)
  return elem
}

export { Component }

export default {
  createElement,
  handleWebSocket,
  render,
  Component,
}
