import { connectWebSocket, handleEvents } from "./client"

// Polyfill closest() for browsers that don't support it.
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

handleEvents(connectWebSocket(window.location))
