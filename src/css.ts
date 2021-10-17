import { Properties } from "csstype"
import { expandProperty } from "inline-style-expand-shorthand"

export type CSSProperties = {
  [key in keyof Properties]?: Properties[key] | null | false
}

// Branded type to distinguish from Properties.
export type CSS = Properties & { __normalized: true }

const CHAR_CODE_LOWER_A = "a".charCodeAt(0)
const CHAR_CODE_UPPER_A = "A".charCodeAt(0)
const CHAR_CODE_UPPER_Z = "Z".charCodeAt(0)
const NUM_LETTERS = 26

export const CLASS_PREFIX = "p-"

export function css(...allCSSProperties: CSSProperties[]): CSS {
  const result: Properties = {}

  for (const cssProperties of allCSSProperties) {
    Object.keys(cssProperties).forEach(rawKey => {
      const key = rawKey as keyof typeof cssProperties
      const value = cssProperties[key]
      if (value === null || value === undefined || value === false) {
        return
      }

      const expanded = expandProperty(key, String(value))
      if (expanded) {
        Object.assign(result, expanded)
      } else {
        ;(result as any)[key] = value
      }
    })
  }

  return result as CSS
}

export function generateClass(index: number): string {
  const classChars = []
  do {
    const offset = index % NUM_LETTERS
    classChars.push(String.fromCharCode(CHAR_CODE_LOWER_A + offset))
    index = Math.floor(index / NUM_LETTERS)
  } while (index > 0)
  return CLASS_PREFIX + classChars.reverse().join("")
}

export function generateProperty<T extends keyof CSS>(
  key: T,
  value: CSS[T],
): string {
  let propertyName = ""
  for (let i = 0; i < key.length; i++) {
    const code = key.charCodeAt(i)
    if (code >= CHAR_CODE_UPPER_A && code <= CHAR_CODE_UPPER_Z) {
      propertyName += "-" + key[i].toLowerCase()
    } else {
      propertyName += key[i]
    }
  }
  return `${propertyName}: ${value}`
}

export function generateRule(className: string, propertyText: string): string {
  return `.${className} { ${propertyText} }`
}
