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
  array: JSX.NestedArray<T>,
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

function isJSXChild(child: JSX.Child): child is JSX.Element {
  return child && (child as any).nodeName
}
