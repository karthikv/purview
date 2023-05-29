import {
  tryParseJSON,
  isSelect,
  isInput,
  STYLE_TAG_ID,
  WS_PING_INTERVAL,
  WS_PONG_TIMEOUT,
} from "./helpers"
import { initMorph, morph, clearSetValueTimer } from "./morph"
import {
  ServerMessage,
  ClientMessage,
  EventMessage,
  UpdateMessage,
} from "./types/ws"

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

const STYLE_TAG_ERROR = `Purview: expected element with ID ${STYLE_TAG_ID} to be a style tag generated by purview`

export function connectWebSocket(location: Location): WebSocket {
  // For more context, see comment in src/browser.ts where we wait for the DOM to load.
  if (document.readyState === "loading") {
    throw new Error(
      "Purview: connectWebSocket() should only be called after the DOM has loaded.",
    )
  }

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
  addWebSocketHandlers(state, location)
  return state.ws
}

function addWebSocketHandlers(state: WebSocketState, location: Location): void {
  const ws = state.ws

  const rawStyleElem = document.getElementById(STYLE_TAG_ID)
  let styleElem: HTMLStyleElement | undefined
  if (rawStyleElem) {
    if (rawStyleElem instanceof HTMLStyleElement) {
      styleElem = rawStyleElem
    } else {
      throw new Error(STYLE_TAG_ERROR)
    }
  }

  let interval: number | null = null
  ws.addEventListener("open", () => {
    const rootElems = Array.from(document.querySelectorAll("[data-root]"))
    const rootIDs = rootElems.map(elem => {
      return elem.getAttribute("data-component-id") as string
    })

    if (rootElems.length === 0) {
      throw new Error("Purview: no root elements found.")
    }

    let cssStateID: string | undefined
    if (styleElem) {
      cssStateID = styleElem.getAttribute("data-css-state-id") ?? undefined
    }

    rootElems.forEach(initMorph)
    sendMessage(ws, { type: "connect", rootIDs, cssStateID })

    // Explicitly call window.setInterval() so Webpack's ts-loader type
    // checking passes. Otherwise, the return type is NodeJS.Timer, which
    // ts-loader doesn't recognize.
    interval = window.setInterval(
      () => pingServer(ws, WS_PONG_TIMEOUT),
      WS_PING_INTERVAL,
    )
  })

  ws.addEventListener("message", messageEvent => {
    if (messageEvent.data === "pong") {
      return
    }

    const message = tryParseJSON<ServerMessage>(messageEvent.data)

    switch (message.type) {
      case "update":
        addEventHandlers(state, state.seenEventNames, message.newEventNames)
        const selector = `[data-component-id="${message.componentID}"]`
        const elem = document.querySelector(selector)

        // Perform CSS updates before morphing so there's no FOUC.
        const { cssUpdates } = message
        if (cssUpdates) {
          if (!styleElem) {
            throw new Error("Purview: could not find style element.")
          }
          updateCSS(state, styleElem, cssUpdates)
        }

        if (elem) {
          morph(elem, message.pNode)
        }

        state.numRetries = 0
        state.waitTime = INITIAL_WAIT_TIME
        break
    }
  })

  ws.addEventListener("close", () => {
    if (typeof interval === "number") {
      // During testing, window.clearInterval is different than the global
      // clearInterval. Because we used window.setInterval to set this timer,
      // we need to use window.clearInterval to clear it.
      window.clearInterval(interval)
      interval = null
    }

    if (state.numRetries === MAX_RETRIES) {
      location.reload()
    } else {
      if (process.env.NODE_ENV !== "test") {
        window.setTimeout(() => {
          state.ws = new WebSocket(state.url)
          addWebSocketHandlers(state, location)
        }, state.waitTime)
      }
      state.numRetries += 1
      state.waitTime *= RETRY_FACTOR
    }
  })
}

// At any given time, there should only be one active WebSocket, and hence one
// active termination timer, but we still use a WeakMap here for a few reasons:
//
// - We can keep this code analogous to pingClients() in purview.ts.
// - Reconnects are easy: they will introduce a new WebSocket object, which will
//   have a new timer in the map.
// - We don't need to worry about clean up.
const terminationTimers = new WeakMap<WebSocket, number | null>()

// If the server doesn't respond with a pong in the timeout (given in
// milliseconds), forcibly terminate the connection.
export function pingServer(ws: WebSocket, timeout: number): void {
  if (!terminationTimers.has(ws)) {
    // First time we're processing this websocket; listen for pongs to clear
    // the termination timer.
    ws.addEventListener("message", messageEvent => {
      if (messageEvent.data === "pong") {
        const timer = terminationTimers.get(ws)
        if (typeof timer === "number") {
          // During testing, window.clearTimeout is different than the global
          // clearTimeout. Because we used window.setTimeout to set this timer,
          // we need to use window.clearTimeout to clear it.
          window.clearTimeout(timer)
        }

        // N.B. We want to maintain an association in the WeakMap so that we
        // don't add another pong handler.
        terminationTimers.set(ws, null)
      }
    })
  }

  // If no termination timer is set, either because one has never been set, or
  // because the last was cleared from a pong, set one.
  if (typeof terminationTimers.get(ws) !== "number") {
    terminationTimers.set(
      ws,
      // Explicitly call window.setTimeout() so Webpack's ts-loader type
      // checking passes. Otherwise, the return type is NodeJS.Timer, which
      // ts-loader doesn't recognize.
      window.setTimeout(() => ws.close(), timeout),
    )
  }

  // Ask the server to send us a pong.
  ws.send("ping")
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
        const rootID = triggerElem
          .closest("[data-root]")!
          .getAttribute("data-component-id")!
        const componentID = triggerElem
          .closest("[data-component-id]")!
          .getAttribute("data-component-id")!

        const message: EventMessage = {
          type: "event",
          rootID,
          componentID,
          eventID: triggerElem.getAttribute(attr) as string,
        }

        switch (eventName) {
          case "input":
          case "change":
            message.event = {
              name: (target as HTMLInputElement).name || "",
              value: inputValue(target),
            }

            // The debouncing in maybeSetValue() is not foolproof. Say the user
            // types a key during the debounce interval. It's possible for the
            // server to send down a controlled value after the debounced
            // callback has been run. Then the old value will be set, and if the
            // user types anything further, his/her initial key press will be
            // overidden and hence not take effect.
            //
            // To avoid this, each time the user types a key, we stop the
            // debounced callback from running. We expect the server to send
            // a new controlled value in response to this event, so we'll
            // receive that value shortly and set it appropriately.
            clearSetValueTimer(target)
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
            const fields: Record<string, unknown> = {}

            Array.from(elems).forEach(elem => {
              if (
                !elem.name ||
                elem.disabled ||
                (elem.type === "radio" && !elem.checked)
              ) {
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

function updateCSS(
  state: WebSocketState,
  styleElem: HTMLStyleElement,
  cssUpdates: NonNullable<UpdateMessage["cssUpdates"]>,
): void {
  const sheet = styleElem.sheet
  if (!sheet) {
    throw new Error("Purview: could not get sheet from style tag")
  }

  if (cssUpdates.nextRuleIndex > sheet.cssRules.length) {
    throw new Error(
      "Purview: CSS rules are inconsistent (nextRuleIndex exceeds sheet.cssRules.length)",
    )
  }

  let newCSSRules = cssUpdates.newCSSRules
  if (sheet.cssRules.length > cssUpdates.nextRuleIndex) {
    newCSSRules = newCSSRules.slice(
      sheet.cssRules.length - cssUpdates.nextRuleIndex,
    )
  }
  for (const rule of newCSSRules) {
    sheet.insertRule(rule, sheet.cssRules.length)
  }

  if (
    cssUpdates.nextRuleIndex + cssUpdates.newCSSRules.length !==
    sheet.cssRules.length
  ) {
    throw new Error("Purview: CSS rules are inconsistent (lengths don't match)")
  }
  sendMessage(state.ws, {
    type: "nextRuleIndex",
    nextRuleIndex: sheet.cssRules.length,
  })
}

function sendMessage(ws: WebSocket, message: ClientMessage): void {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message))
  }
}
