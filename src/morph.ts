import morphdom = require("morphdom")
import { isInput, isOption, isSelect, isTextArea } from "./helpers"

const selectedValues = new WeakMap()
const morphOpts = {
  onBeforeElUpdated(from: HTMLElement, to: HTMLElement): boolean {
    if (
      isInput(from) &&
      isInput(to) &&
      to.getAttribute("autocomplete") !== "off"
    ) {
      to.checked = from.checked
      to.value = from.value
    }

    if (
      isTextArea(from) &&
      isTextArea(to) &&
      to.getAttribute("autocomplete") !== "off"
    ) {
      to.value = from.value
    }

    if (isSelect(from) && isSelect(to)) {
      selectedValues.delete(to)

      if (to.getAttribute("autocomplete") !== "off") {
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

    if (isOption(from) && isOption(to) && to.parentNode) {
      const values = selectedValues.get(to.parentNode)
      if (values) {
        if (values.includes(to.value)) {
          to.setAttribute("selected", "true")
        } else {
          to.removeAttribute("selected")
        }
      }
    }

    return true
  },
}

export default function morph(from: Node, to: Node): void {
  morphdom(from, to, morphOpts)
}
