import { tryParseJSON, isSelect, isInput } from "./helpers"
import { initMorph, morph } from "./morph"
import { ServerMessage, ClientMessage, EventMessage } from "./types/ws"

interface WebSocketState {
  ws: WebSocket
  url: string
  seenEventNames: Set<string>
  numRetries: number
  waitTime: number
}

const MAX_RETRIES = 7
const RETRY_FACTOR = 1.5
const INITIAL_WAIT_TIME = 250

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

  const url = `${wsProtocol}//${host}${pathname}${search}`
  const state: WebSocketState = {
    url,
    ws: new WebSocket(url),
    seenEventNames: new Set(),
    numRetries: 0,
    waitTime: INITIAL_WAIT_TIME,
  }
  addWebSocketHandlers(state)
  return state.ws
}

function addWebSocketHandlers(state: WebSocketState): void {
  const ws = state.ws

  ws.addEventListener("open", () => {
    const rootElems = Array.from(document.querySelectorAll("[data-root]"))
    const rootIDs = rootElems.map(elem => {
      return elem.getAttribute("data-component-id") as string
    })

    rootElems.forEach(initMorph)
    sendMessage(ws, { type: "connect", rootIDs })
  })

  ws.addEventListener("message", (messageEvent: MessageEvent) => {
    const message = tryParseJSON<ServerMessage>(messageEvent.data)

    switch (message.type) {
      case "update":
        addEventHandlers(state, state.seenEventNames, message.newEventNames)
        const selector = `[data-component-id="${message.componentID}"]`
        const elem = document.querySelector(selector)

        if (elem) {
          morph(elem, message.pNode)
        }
        state.numRetries = 0
        state.waitTime = INITIAL_WAIT_TIME
        break
    }
  })

  ws.addEventListener("close", () => {
    if (state.numRetries === MAX_RETRIES) {
      location.reload()
    } else {
      if (process.env.NODE_ENV !== "test") {
        setTimeout(() => {
          state.ws = new WebSocket(state.url)
          addWebSocketHandlers(state)
        }, state.waitTime)
      }
      state.numRetries += 1
      state.waitTime *= RETRY_FACTOR
    }
  })
}

function addEventHandlers(
  state: WebSocketState,
  seenEventNames: Set<string>,
  newEventNames: string[],
): void {
  let added = false
  newEventNames.forEach(name => {
    if (!seenEventNames.has(name)) {
      handleEvent(state, name, false)
      handleEvent(state, name, true)

      seenEventNames.add(name)
      added = true
    }
  })

  if (added) {
    sendMessage(state.ws, {
      type: "seenEventNames",
      seenEventNames: Array.from(seenEventNames),
    })
  }
}

function handleEvent(
  state: WebSocketState,
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
      if (triggerElem && eventName === "submit") {
        event.preventDefault()
      }

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

        switch (eventName) {
          case "input":
          case "change":
            message.event = {
              name: (target as HTMLInputElement).name || "",
              value: inputValue(target),
            }
            break

          case "keydown":
          case "keypress":
          case "keyup":
            message.event = {
              name: (target as HTMLInputElement).name || "",
              key: (event as KeyboardEvent).key,
            }
            break

          case "submit":
            const elems = target.querySelectorAll<HTMLInputElement>(
              "input, select, textarea, button",
            )
            const fields: { [key: string]: any } = {}

            Array.from(elems).forEach(elem => {
              if (!elem.name || elem.disabled) {
                return
              }
              fields[elem.name] = inputValue(elem)
            })

            message.event = { fields }
            break
        }

        sendMessage(state.ws, message)

        triggerElem = triggerElem.parentElement
        if (triggerElem) {
          triggerElem = triggerElem.closest(`[${attr}]`)
        }
      }
    },
    useCapture,
  )
}

function inputValue(elem: HTMLElement): string[] | boolean | number | string {
  if (isSelect(elem) && elem.multiple) {
    return Array.from(elem.options)
      .filter(option => option.selected)
      .map(option => option.value)
  } else if (isInput(elem) && elem.type === "checkbox") {
    return elem.checked
  } else if (isInput(elem) && elem.type === "number") {
    return Number(elem.value)
  } else {
    return (elem as HTMLInputElement).value
  }
}

function sendMessage(ws: WebSocket, message: ClientMessage): void {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message))
  }
}
