import vnode, { VNode } from "snabbdom/vnode"
import { Attrs } from "snabbdom/modules/attributes"

type EventAttribute = keyof JSX.DOMAttributes

const EVENT_ATTRS_MAP: { [key in EventAttribute]: true } = {
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
  const mapped: U[] = []
  eachNested(array, e => mapped.push(callback(e)))
  return mapped
}

export function virtualize({
  nodeName,
  attributes,
  children,
}: JSX.Element): VNode {
  if (typeof nodeName !== "string") {
    throw new Error("Expected an intrinsic JSX element.")
  }

  const attrs: Attrs = {}
  for (const key in attributes) {
    if (attributes.hasOwnProperty(key)) {
      attrs[key] = (attributes as any)[key]
    }
  }

  if (!(children instanceof Array)) {
    children = [children]
  }
  const vChildren: VNode[] = []
  eachNested(children, child => {
    if (isJSXChild(child)) {
      vChildren.push(virtualize(child))
    } else if (child) {
      const text = String(child)
      const vNode = vnode(undefined, undefined, undefined, text, undefined)
      vChildren.push(vNode)
    }
  })

  return vnode(nodeName, { attrs }, vChildren, undefined, undefined)
}

export function concretize(vNode: VNode, doc?: Document): Element {
  if (!doc) {
    doc = document
  }
  if (!vNode.sel) {
    throw new Error("Expected non-text root node")
  }

  const elem = doc.createElement(vNode.sel)
  const { data, children } = vNode

  if (data && data.attrs) {
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

  if (children) {
    children.forEach(child => {
      if (typeof child === "string") {
        elem.appendChild(doc!.createTextNode(child))
      } else if (!child.sel) {
        elem.appendChild(doc!.createTextNode(child.text as string))
      } else {
        elem.appendChild(concretize(child, doc))
      }
    })
  }

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

function isJSXChild(child: JSX.Child): child is JSX.Element {
  return child && (child as any).nodeName
}
