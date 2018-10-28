import morphdom = require("morphdom")

const selectedValues = new WeakMap()
const morphOpts = {
  onBeforeElUpdated(from: HTMLElement, to: HTMLElement): boolean {
    if (isInput(from) && isInput(to)) {
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

    if (isSelect(from) && isSelect(to)) {
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

    if (isOption(from) && isOption(to)) {
      if (!to.hasAttribute("selected") && to.parentNode) {
        const values = selectedValues.get(to.parentNode)
        if (values && values.includes(to.value)) {
          to.setAttribute("selected", "true")
        }
      }
    }

    if (isTextArea(from) && isTextArea(to)) {
      if (to.textContent) {
        to.value = to.textContent
      } else {
        to.value = from.value
      }
    }

    return true
  },
}

export default function morph(from: Node, to: Node): void {
  morphdom(from, to, morphOpts)
}

function isInput(elem: HTMLElement): elem is HTMLInputElement {
  return elem.nodeName === "INPUT"
}

function isOption(elem: HTMLElement): elem is HTMLOptionElement {
  return elem.nodeName === "OPTION"
}

function isSelect(elem: HTMLElement): elem is HTMLSelectElement {
  return elem.nodeName === "SELECT"
}

function isTextArea(elem: HTMLElement): elem is HTMLTextAreaElement {
  return elem.nodeName === "TEXTAREA"
}
