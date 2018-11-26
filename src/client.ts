import { tryParseJSON, parseHTML, isSelect, isInput } from "./helpers"
import morph from "./morph"
import { ServerMessage, ClientMessage, EventMessage } from "./types/ws"

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
  const seenEventNames = new Set()

  ws.addEventListener("open", () => {
    const rootElems = Array.from(document.querySelectorAll("[data-root]"))
    const rootIDs = rootElems.map(elem => {
      return elem.getAttribute("data-component-id") as string
    })
    sendMessage(ws, { type: "connect", rootIDs })
  })

  ws.addEventListener("message", messageEvent => {
    // TODO: validation
    const message = tryParseJSON<ServerMessage>(messageEvent.data)

    switch (message.type) {
      case "connected":
        addEventHandlers(ws, seenEventNames, message.newEventNames)
        break

      case "update":
        addEventHandlers(ws, seenEventNames, message.newEventNames)
        const selector = `[data-component-id="${message.componentID}"]`
        const elem = document.querySelector(selector)

        if (elem) {
          morph(elem, parseHTML(message.html))
        }
        break
    }
  })

  ws.addEventListener("close", () => location.reload())
  return ws
}

function addEventHandlers(
  ws: WebSocket,
  seenEventNames: Set<string>,
  newEventNames: string[],
): void {
  let added = false
  newEventNames.forEach(name => {
    if (!seenEventNames.has(name)) {
      handleEvent(ws, name, false)
      handleEvent(ws, name, true)

      seenEventNames.add(name)
      added = true
    }
  })

  if (added) {
    sendMessage(ws, {
      type: "seenEventNames",
      seenEventNames: Array.from(seenEventNames),
    })
  }
}

function handleEvent(
  ws: WebSocket,
  eventName: string,
  useCapture: boolean,
): void {
  const elemRootIDs = new WeakMap()
  const attr = useCapture ? `data-${eventName}-capture` : `data-${eventName}`

  window.addEventListener(
    eventName,
    event => {
      const target = event.target
      if (!(target instanceof HTMLElement)) {
        return
      }

      let triggerElem = target.closest(`[${attr}]`)
      while (triggerElem) {
        let rootID = elemRootIDs.get(triggerElem)

        if (!rootID) {
          const rootElem = triggerElem.closest("[data-root]") as Element
          rootID = rootElem.getAttribute("data-component-id")
          elemRootIDs.set(triggerElem, rootID)
        }

        const message: EventMessage = {
          type: "event",
          rootID,
          eventID: triggerElem.getAttribute(attr) as string,
        }

        if (eventName === "input" || eventName === "change") {
          if (eventName === "change" && isSelect(target) && target.multiple) {
            const values = Array.from(target.options)
              .filter(option => option.selected)
              .map(option => option.value)
            message.event = { value: values }
          } else if (isInput(target) && target.type === "checkbox") {
            message.event = { value: target.checked }
          } else if (isInput(target) && target.type === "number") {
            message.event = { value: Number(target.value) }
          } else {
            message.event = { value: (target as HTMLInputElement).value }
          }
        } else if (
          eventName === "keydown" ||
          eventName === "keypress" ||
          eventName === "keyup"
        ) {
          message.event = { key: (event as KeyboardEvent).key }
        }

        sendMessage(ws, message)

        triggerElem = triggerElem.parentElement
        if (triggerElem) {
          triggerElem = triggerElem.closest(`[${attr}]`)
        }
      }
    },
    useCapture,
  )
}

function sendMessage(ws: WebSocket, message: ClientMessage): void {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message))
  }
}
