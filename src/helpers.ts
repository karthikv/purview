import { Attrs } from "snabbdom/modules/attributes"
import { PNodeRegular, PNode } from "./types/ws"
import { JSX, NestedArray } from "./purview"

type EventAttribute = keyof JSX.DOMAttributes

const EVENT_ATTRS_MAP: Record<EventAttribute, true> = {
  // Clipboard Events
  onCopy: true,
  onCopyCapture: true,
  onCut: true,
  onCutCapture: true,
  onPaste: true,
  onPasteCapture: true,

  // Composition Events
  onCompositionEnd: true,
  onCompositionEndCapture: true,
  onCompositionStart: true,
  onCompositionStartCapture: true,
  onCompositionUpdate: true,
  onCompositionUpdateCapture: true,

  // Focus Events
  onFocus: true,
  onFocusCapture: true,
  onBlur: true,
  onBlurCapture: true,

  // Form Events
  onChange: true,
  onChangeCapture: true,
  onInput: true,
  onInputCapture: true,
  onReset: true,
  onResetCapture: true,
  onSubmit: true,
  onSubmitCapture: true,
  onInvalid: true,
  onInvalidCapture: true,

  // Image Events
  onLoad: true,
  onLoadCapture: true,
  onError: true,
  onErrorCapture: true, // also a Media Event

  // Keyboard Events
  onKeyDown: true,
  onKeyDownCapture: true,
  onKeyPress: true,
  onKeyPressCapture: true,
  onKeyUp: true,
  onKeyUpCapture: true,

  // MouseEvents
  onAuxClick: true,
  onClick: true,
  onClickCapture: true,
  onContextMenu: true,
  onContextMenuCapture: true,
  onDblClick: true,
  onDblClickCapture: true,
  onDrag: true,
  onDragCapture: true,
  onDragEnd: true,
  onDragEndCapture: true,
  onDragEnter: true,
  onDragEnterCapture: true,
  onDragExit: true,
  onDragExitCapture: true,
  onDragLeave: true,
  onDragLeaveCapture: true,
  onDragOver: true,
  onDragOverCapture: true,
  onDragStart: true,
  onDragStartCapture: true,
  onDrop: true,
  onDropCapture: true,
  onMouseDown: true,
  onMouseDownCapture: true,
  onMouseEnter: true,
  onMouseLeave: true,
  onMouseMove: true,
  onMouseMoveCapture: true,
  onMouseOut: true,
  onMouseOutCapture: true,
  onMouseOver: true,
  onMouseOverCapture: true,
  onMouseUp: true,
  onMouseUpCapture: true,

  // Touch Events
  onTouchCancel: true,
  onTouchCancelCapture: true,
  onTouchEnd: true,
  onTouchEndCapture: true,
  onTouchMove: true,
  onTouchMoveCapture: true,
  onTouchStart: true,
  onTouchStartCapture: true,

  // UI Events
  onScroll: true,
  onScrollCapture: true,

  // Wheel Events
  onWheel: true,
  onWheelCapture: true,

  // Animation Events
  onAnimationStart: true,
  onAnimationStartCapture: true,
  onAnimationEnd: true,
  onAnimationEndCapture: true,
  onAnimationIteration: true,
  onAnimationIterationCapture: true,

  // Transition Events
  onTransitionEnd: true,
  onTransitionEndCapture: true,
}

export const EVENT_ATTRS = new Set(Object.keys(EVENT_ATTRS_MAP))
export const CAPTURE_TEXT = "Capture"
export const STYLE_TAG_ID = "purview-css"

export const WS_PING_INTERVAL = 2_000 // ms
export const WS_PONG_TIMEOUT = 5_000 // ms

export function isEventAttr(attr: string): attr is EventAttribute {
  return EVENT_ATTRS.has(attr)
}

export function toEventName(attr: EventAttribute): string {
  if (attr.indexOf(CAPTURE_TEXT) === attr.length - CAPTURE_TEXT.length) {
    return attr.slice(2, -CAPTURE_TEXT.length).toLowerCase()
  }
  return attr.slice(2).toLowerCase()
}

export function tryParseJSON<T>(json: string): T {
  try {
    return JSON.parse(json)
  } catch (_) {
    throw new Error(`Invalid JSON: ${json}`)
  }
}

export function parseHTML(html: string): Element {
  const template = document.createElement("template")
  template.innerHTML = html
  const fragment = document.importNode(template.content, true)
  return fragment.children[0]
}

export function eachNested<T>(
  array: NestedArray<T>,
  callback: (elem: T) => void,
): void {
  array.forEach(elem => {
    if (elem instanceof Array) {
      eachNested(elem, callback)
    } else {
      callback(elem)
    }
  })
}

export function findNested<T>(
  array: NestedArray<T>,
  callback: (elem: T) => boolean,
): T | null {
  for (const elem of array) {
    if (elem instanceof Array) {
      findNested(elem, callback)
    } else if (callback(elem)) {
      return elem
    }
  }
  return null
}

export function mapNested<T, U>(
  array: NestedArray<T>,
  callback: (elem: T) => U,
): U[] {
  const mapped: U[] = new Array(array.length)
  let i = 0

  eachNested(array, elem => {
    // Will naturally expand the array if it exceeds capacity.
    mapped[i] = callback(elem)
    i++
  })

  mapped.length = i
  return mapped
}

export function virtualize({
  nodeName,
  attributes,
  children,
}: JSX.Element): PNodeRegular {
  if (typeof nodeName !== "string") {
    throw new Error("Expected an intrinsic JSX element.")
  }

  const attrs: Attrs = {}
  for (const key in attributes) {
    if (attributes.hasOwnProperty(key)) {
      attrs[key.toLowerCase()] = (attributes as any)[key]
    }
  }

  if (!(children instanceof Array)) {
    children = [children]
  }
  const vChildren: PNode[] = []
  eachNested(children, child => {
    if (isJSXElement(child)) {
      vChildren.push(virtualize(child))
    } else if (child !== null && child !== undefined) {
      vChildren.push({ text: String(child) })
    }
  })

  return {
    sel: nodeName,
    data: { attrs },
    children: vChildren,
  }
}

export function concretize(pNode: PNodeRegular, doc?: Document): Element {
  if (!doc) {
    doc = document
  }

  const elem = doc.createElement(pNode.sel)
  const { data, children } = pNode

  if (data.attrs) {
    const attrs = data.attrs
    for (const key in attrs) {
      if (attrs.hasOwnProperty(key)) {
        if (attrs[key] === true) {
          elem.setAttribute(key, "")
        } else {
          elem.setAttribute(key, attrs[key])
        }
      }
    }
  }

  children.forEach(child => {
    if ("text" in child) {
      elem.appendChild(doc!.createTextNode(child.text))
    } else {
      elem.appendChild(concretize(child, doc))
    }
  })

  return elem
}

export function isInput(node: Node): node is HTMLInputElement {
  return node.nodeName === "INPUT"
}

export function isOption(node: Node): node is HTMLOptionElement {
  return node.nodeName === "OPTION"
}

export function isSelect(node: Node): node is HTMLSelectElement {
  return node.nodeName === "SELECT"
}

export function isTextArea(node: Node): node is HTMLTextAreaElement {
  return node.nodeName === "TEXTAREA"
}

export function isJSXElement(child: JSX.Child): child is JSX.Element {
  return child !== null && typeof child === "object" && "nodeName" in child
}
