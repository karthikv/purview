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
