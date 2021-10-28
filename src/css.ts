import { Properties } from "csstype"
import { expandProperty } from "inline-style-expand-shorthand"
import { lexer } from "css-tree"
import * as LRU from "lru-cache"

export type CSSProperties = {
  [key in keyof Properties]?: Properties[key] | null | false
}

// Branded type to distinguish from Properties.
export type CSS = Properties & { __brand: "CSS" }

// Branded type to distinguish from string.
export type PropertyText = string & { __brand: "PropertyText" }

const CHAR_CODE_LOWER_A = "a".charCodeAt(0)
const CHAR_CODE_UPPER_A = "A".charCodeAt(0)
const CHAR_CODE_UPPER_Z = "Z".charCodeAt(0)
const NUM_LETTERS = 26

// Per https://acss.io/frequently-asked-questions.html#:~:text=declarations:
// - The largest sites seem to have fewer than 20,000 declarations.
// - There are approximately 40 bytes per declaration (property) if you
//   aggregate across the listed sites.
//
// We use a limit of 25,000 here to account for most sites. This will take
// approximately 25,000 * 40 = ~1 MB (not including the boolean value or any
// other internals of the LRU cache), which is very little.
const VALID_CSS_PROPERTIES_CACHE = new LRU<string, boolean>(25_000)

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
  // Don't allow undefined values.
  value: NonNullable<CSS[T]>,
): PropertyText {
  let propertyName = ""
  for (let i = 0; i < key.length; i++) {
    const code = key.charCodeAt(i)
    if (code >= CHAR_CODE_UPPER_A && code <= CHAR_CODE_UPPER_Z) {
      propertyName += "-" + key[i].toLowerCase()
    } else {
      propertyName += key[i]
    }
  }

  // Calling lexer.matchProperty() below can be expensive, taking over 5ms in
  // certain instances. We use a cache to reduce the time for subsequent calls
  // of the same property.
  const propertyText = `${propertyName}: ${value}`
  if (VALID_CSS_PROPERTIES_CACHE.get(propertyText)) {
    return propertyText as PropertyText
  }

  const match = lexer.matchProperty(propertyName, String(value))
  if (match.error) {
    throw match.error
  }

  VALID_CSS_PROPERTIES_CACHE.set(propertyText, true)
  return propertyText as PropertyText
}

export function generateRule(
  className: string,
  propertyText: PropertyText,
): string {
  return `.${className} { ${propertyText} }`
}
