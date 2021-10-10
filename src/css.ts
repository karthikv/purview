import { Properties } from "csstype"
import { expandProperty } from "inline-style-expand-shorthand"

export type CSS = { [key in keyof Properties]?: Properties[key] | null | false }

const CHAR_CODE_A = "a".charCodeAt(0)
const NUM_LETTERS = 26

export function normalizeCSS(css: CSS | CSS[]): Properties {
  if (css instanceof Array) {
    return Object.assign({}, ...css.map(normalizeCSS))
  }

  const result: Properties = {}
  for (const rawKey in css) {
    if (css.hasOwnProperty(rawKey)) {
      const key = rawKey as keyof CSS
      const value = css[key]
      if (value === null || value === undefined || value === false) {
        continue
      }

      const expanded = expandProperty(key, String(value)) || { [key]: value }
      Object.assign(result, expanded)
    }
  }

  return result
}

export function generateClass(index: number): string {
  const classChars = []
  do {
    const offset = index % NUM_LETTERS
    classChars.push(String.fromCharCode(CHAR_CODE_A + offset))
    index = Math.floor(index / NUM_LETTERS)
  } while (index > 0)
  return classChars.reverse().join("")
}
