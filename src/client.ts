import { tryParse } from "./helpers"
import morphdom = require("morphdom")

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

function isInputElement(elem: HTMLElement): elem is HTMLInputElement {
  return elem.nodeName === "INPUT"
}

function isOptionElement(elem: HTMLElement): elem is HTMLOptionElement {
  return elem.nodeName === "OPTION"
}

function isSelectElement(elem: HTMLElement): elem is HTMLSelectElement {
  return elem.nodeName === "SELECT"
}

const selectedValues = new WeakMap()

const morphOpts = {
  onBeforeElUpdated(from: HTMLElement, to: HTMLElement): boolean {
    if (isInputElement(from) && isInputElement(to)) {
      if (to.hasAttribute("value")) {
        to.value = to.getAttribute("value") as string
      } else {
        to.value = from.value
      }

      if (to.hasAttribute("checked")) {
        to.checked = true
      } else {
        to.checked = from.checked
      }
    }

    if (isSelectElement(from) && isSelectElement(to)) {
      selectedValues.delete(to)
      if (!to.querySelector("option[selected]")) {
        if (to.hasAttribute("multiple")) {
          const values = Array.from(from.querySelectorAll("option"))
            .filter(option => option.selected)
            .map(option => option.value)
          selectedValues.set(to, values)
        } else {
          selectedValues.set(to, [from.value])
        }
      }
    }

    if (isOptionElement(from) && isOptionElement(to)) {
      if (!to.hasAttribute("selected") && to.parentNode) {
        const values = selectedValues.get(to.parentNode)
        if (values && values.includes(to.value)) {
          to.setAttribute("selected", "true")
        }
      }
    }
    return true
  },
}

ws.onmessage = messageEvent => {
  const message = tryParse<ServerMessage>(messageEvent.data)

  switch (message.type) {
    case "update":
      const selector = `[data-component-id=\"${message.componentID}\"]`
      const elem = document.querySelector(selector)

      if (elem) {
        const div = document.createElement("div")
        div.innerHTML = message.html
        morphdom(elem, div.firstChild as Node, morphOpts)
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
