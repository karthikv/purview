import { tryParseJSON, parseHTML } from "./helpers"
import morph from "./morph"

export function connectWebSocket(location: Location): WebSocket {
  const { protocol, host, pathname, search } = location
  let wsProtocol: string

  if (protocol === "https:") {
    wsProtocol = "wss:"
  } else if (protocol === "http:") {
    wsProtocol = "ws:"
  } else {
    throw new Error(`Invalid protocol ${protocol}`)
  }

  const wsURL = `${wsProtocol}//${host}${pathname}${search}`
  const ws = new WebSocket(wsURL)

  ws.onopen = () => {
    const rootElems = Array.from(document.querySelectorAll("[data-root]"))
    const rootIDs = rootElems.map(elem => {
      return elem.getAttribute("data-component-id") as string
    })
    sendMessage(ws, { type: "connect", rootIDs })
  }

  ws.onmessage = messageEvent => {
    // TODO: validation
    const message = tryParseJSON<ServerMessage>(messageEvent.data)

    switch (message.type) {
      case "update":
        const selector = `[data-component-id="${message.componentID}"]`
        const elem = document.querySelector(selector)

        if (elem) {
          morph(elem, parseHTML(message.html))
        }
        break
    }
  }

  ws.onclose = () => location.reload()
  return ws
}

export function handleEvents(ws: WebSocket): void {
  const elemRootIDs = new WeakMap()

  window.addEventListener("click", event => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    let triggerElem = target.closest("[data-onclick]")
    while (triggerElem) {
      let rootID = elemRootIDs.get(triggerElem)

      if (!rootID) {
        const rootElem = triggerElem.closest("[data-root]") as Element
        rootID = rootElem.getAttribute("data-component-id")
        elemRootIDs.set(triggerElem, rootID)
      }

      sendMessage(ws, {
        type: "event",
        rootID,
        eventID: triggerElem.getAttribute("data-onclick") as string,
      })

      triggerElem = triggerElem.parentElement
      if (triggerElem) {
        triggerElem = triggerElem.closest("[data-onclick]")
      }
    }
  })
}

function sendMessage(ws: WebSocket, message: ClientMessage): void {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message))
  }
}
