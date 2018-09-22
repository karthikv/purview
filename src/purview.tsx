import * as http from "http"
import { EventEmitter } from "events"

import { JSDOM } from "jsdom"
import { v4 as makeUUID } from "uuid"
import * as WebSocket from "ws"

import { tryParse } from "./helpers"

export interface PurviewCtor<P, S> {
  new (props: P): Purview<P, S>
}
type UpdateFn<S> = (state: Readonly<S>) => Partial<S>

const { document } = new JSDOM().window

export default abstract class Purview<P, S> extends EventEmitter {
  // TODO: clean up to avoid memory leaks
  static instances: { [key: string]: Purview<any, any> } = {}

  static createElement(
    nodeName: string | PurviewCtor<any, any>,
    attributes: JSX.IntrinsicAttributes,
    ...children: JSX.Child[]
  ): JSX.Element {
    return { nodeName, attributes, children }
  }

  static handleWebSocket(server: http.Server): void {
    const wsServer = new WebSocket.Server({ server })
    wsServer.on("connection", ws => {
      ws.on("message", data => {
        // TODO: validation
        const message = tryParse<ClientMessage>(data.toString())

        switch (message.type) {
          case "connect":
            message.purviewIDs.forEach(id => {
              const purview = this.instances[id]
              if (!purview) {
                return
              }

              purview.on("materialize", (purviewID, elem) => {
                const update: UpdateMessage = {
                  type: "update",
                  purviewID,
                  html: elem.outerHTML,
                }
                ws.send(JSON.stringify(update))
              })
            })
            break

          case "event":
            const instance = this.instances[message.purviewID]
            if (!instance) {
              return
            }

            const handler = instance.handlers[message.eventID]
            if (!handler) {
              return
            }

            handler()
            break
        }
      })
    })
  }

  static renderToString(jsxElem: JSX.Element): string {
    if (typeof jsxElem.nodeName !== "function") {
      throw new Error("Root element must be a Purview component")
    }

    const args = Object.assign(
      { children: jsxElem.children },
      jsxElem.attributes,
    )
    const purview = new jsxElem.nodeName(args)

    const root = purview._materialize()
    root.setAttribute("data-purview-root", "true")
    return root.outerHTML
  }

  protected state: Readonly<S>
  protected id: string

  private handlers: { [key: string]: () => void }
  private childInstances: Array<Purview<any, any>> = []

  constructor(protected props: Readonly<P>) {
    super()
    this.id = makeUUID()
  }

  abstract render(): JSX.Element

  setState(changes: Partial<S> | UpdateFn<S>): void {
    if (changes instanceof Function) {
      Object.assign(this.state, changes(this.state))
    } else {
      Object.assign(this.state, changes)
    }
    this.emit("materialize", this.id, this._materialize())
  }

  _materialize(): Element {
    this.handlers = {}
    this.childInstances.forEach(child => {
      delete Purview.instances[child.id]
      child.off("materialize", this.propagateMaterialize)
    })
    this.childInstances = []

    const elem = this._materializeElem(this.render())
    elem.setAttribute("data-purview-id", this.id)
    Purview.instances[this.id] = this

    this.childInstances.forEach(child => {
      child.on("materialize", this.propagateMaterialize)
    })
    return elem
  }

  _materializeElem({ nodeName, attributes, children }: JSX.Element): Element {
    const childNodes = children.map(child => {
      if (child === null) {
        return null
      } else if (typeof child === "object") {
        return this._materializeElem(child)
      } else {
        return document.createTextNode(String(child))
      }
    })

    let elem: Element
    if (typeof nodeName === "string") {
      elem = document.createElement(nodeName)
    } else {
      const args = Object.assign({ children }, attributes)
      const purview = new nodeName(args)

      this.childInstances.push(purview)
      elem = purview._materialize()
    }

    for (const key in attributes) {
      if (attributes.hasOwnProperty(key)) {
        if (key === "onClick") {
          const eventID = makeUUID()
          this.handlers[eventID] = attributes[key] as any
          elem.setAttribute(`data-${key}`, eventID)
        } else {
          const value = (attributes as any)[key]
          elem.setAttribute(key, value)
        }
      }
    }

    childNodes.forEach(child => {
      if (child) {
        elem.appendChild(child)
      }
    })
    return elem
  }

  propagateMaterialize = (...args: any[]): void => {
    this.emit("materialize", ...args)
  }
}
