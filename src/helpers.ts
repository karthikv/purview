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
  const div = document.createElement("div")
  div.innerHTML = html
  return div.children[0]
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

export function toElem({
  nodeName,
  attributes,
  children,
}: JSX.Element): Element {
  if (typeof nodeName !== "string") {
    throw new Error("toHTML() doesn't work with components")
  }

  const elem = document.createElement(nodeName)
  for (const key in attributes) {
    if (attributes.hasOwnProperty(key)) {
      elem.setAttribute(key, (attributes as any)[key])
    }
  }

  if (!(children instanceof Array)) {
    children = [children]
  }
  eachNested(children, child => {
    if (isJSXChild(child)) {
      elem.appendChild(toElem(child))
    } else if (child) {
      const text = String(child)
      elem.appendChild(document.createTextNode(text))
    }
  })

  return elem
}

export function isInput(elem: HTMLElement): elem is HTMLInputElement {
  return elem.nodeName === "INPUT"
}

export function isOption(elem: HTMLElement): elem is HTMLOptionElement {
  return elem.nodeName === "OPTION"
}

export function isSelect(elem: HTMLElement): elem is HTMLSelectElement {
  return elem.nodeName === "SELECT"
}

export function isTextArea(elem: HTMLElement): elem is HTMLTextAreaElement {
  return elem.nodeName === "TEXTAREA"
}

function isJSXChild(child: JSX.Child): child is JSX.Element {
  return child && (child as any).nodeName
}
