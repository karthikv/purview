import { tryParse } from "./helpers"

const { protocol, host, pathname, search } = window.location
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

  const message: ClientMessage = {
    type: "connect",
    rootIDs,
  }
  ws.send(JSON.stringify(message))
}

ws.onmessage = messageEvent => {
  const message = tryParse<ServerMessage>(messageEvent.data)

  switch (message.type) {
    case "update":
      const selector = `[data-component-id=\"${message.componentID}\"]`
      const elem = document.querySelector(selector)

      if (elem) {
        elem.innerHTML = message.html
      }
      break
  }
}

window.addEventListener("click", event => {
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }

  let triggerElem = target.closest("[data-onclick]")
  while (triggerElem) {
    const message: ClientMessage = {
      type: "event",
      eventID: triggerElem.getAttribute("data-onclick") as string,
    }
    ws.send(JSON.stringify(message))

    triggerElem = triggerElem.parentElement
    if (triggerElem) {
      triggerElem = triggerElem.closest("[data-onclick]")
    }
  }
})

if (!Element.prototype.closest) {
  Element.prototype.closest = function(selector: string): Element | null {
    if (!document.documentElement.contains(this)) {
      return null
    }

    let elem: Element | null = this
    do {
      if (elem.matches(selector)) {
        return elem
      }
      elem = elem.parentElement
    } while (elem !== null)

    return null
  }
}
