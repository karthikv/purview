import { Properties, SimplePseudos } from "csstype"
import { expandProperty } from "inline-style-expand-shorthand"
import { lexer } from "css-tree"
import * as LRU from "lru-cache"
import * as Purview from "./purview"
import { isPseudoClass } from "./pseudo_classes"

type OptionalProperties = {
  [key in keyof Properties]?: Properties[key] | null | false
}

type PseudoProperties<T> = { [key in SimplePseudos]?: T }

export interface CSSProperties
  extends OptionalProperties,
    PseudoProperties<OptionalProperties> {}

// Branded type to distinguish from Properties and PseudoProperties.
export interface CSS extends Properties, PseudoProperties<Properties> {
  __brand: "CSS"
}

export interface AtomicProperty<K extends keyof Properties> {
  key: K
  value: Properties[K]
  pseudoClass?: SimplePseudos
}

// Branded type to distinguish from string.
export type RuleTemplate = string & { __brand: "RuleTemplate" }

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
  // tslint:disable-next-line no-object-literal-type-assertion
  const result: CSS = {} as CSS

  for (const cssProperties of allCSSProperties) {
    Object.keys(cssProperties).forEach(rawKey => {
      const key = rawKey as keyof typeof cssProperties
      const value = cssProperties[key]
      if (value === null || value === undefined || value === false) {
        return
      }

      // We expect only one layer of pseudo classes, but this will technically
      // expand many layers recursively. We rely on the type system to prevent
      // nested layers of pseudo properties from being passed in.
      if (isPseudoClass(key)) {
        result[key] = result[key] ?? {}
        Object.assign(result[key], css(value as OptionalProperties))
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

  return result
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

export function generateRuleTemplate<K extends keyof Properties>(
  ap: AtomicProperty<K>,
): RuleTemplate {
  const { key, value, pseudoClass } = ap
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
    return addPseudoClass(propertyText, pseudoClass)
  }

  const match = lexer.matchProperty(propertyName, String(value))
  if (match.error) {
    throw match.error
  }

  VALID_CSS_PROPERTIES_CACHE.set(propertyText, true)
  return addPseudoClass(propertyText, pseudoClass)
}

function addPseudoClass(
  propertyText: string,
  pseudoClass: SimplePseudos | undefined,
): RuleTemplate {
  if (pseudoClass) {
    if (!isPseudoClass(pseudoClass)) {
      throw new Error(`Invalid pseudo class: ${pseudoClass}`)
    }
    return `${pseudoClass} { ${propertyText} }` as RuleTemplate
  }
  return ` { ${propertyText} }` as RuleTemplate
}

export function generateRule(
  className: string,
  ruleTemplate: RuleTemplate,
): string {
  return `.${className}${ruleTemplate}`
}

export function getAtomicProperties(cssAttr: CSS): Array<AtomicProperty<any>> {
  let atomicProperties: Array<AtomicProperty<any>> = []

  Object.keys(cssAttr).forEach(rawKey => {
    const key = rawKey as keyof typeof cssAttr

    // We expect only one layer of pseudo classes, but this will technically
    // expand many layers recursively. We rely on the type system to prevent
    // nested layers of pseudo properties from being passed in.
    if (isPseudoClass(key)) {
      const value = cssAttr[key]
      if (value) {
        const subProperties = getAtomicProperties(value as CSS)
        subProperties.forEach(ap => (ap.pseudoClass = key))
        atomicProperties = atomicProperties.concat(subProperties)
      }
    } else {
      atomicProperties.push({ key, value: cssAttr[key] })
    }
  })

  return atomicProperties
}

export function styledTag<K extends keyof JSX.IntrinsicElements>(
  // Even though this is a string, it must be uppercase for JSX.
  Tag: K,
  ...baseCSSProperties: CSSProperties[]
): new (props: JSX.IntrinsicElements[K]) => Purview.Component<
  JSX.IntrinsicElements[K],
  {}
> {
  let baseCSS: CSS | undefined
  return class extends Purview.Component<JSX.IntrinsicElements[K], {}> {
    render(): JSX.Element {
      // Lazily compute the CSS.
      if (!baseCSS) {
        baseCSS = css(...baseCSSProperties)
      }

      const { css: cssProperties, children, ...otherProps } = this.props
      const finalCSS = cssProperties ? css(baseCSS, cssProperties!) : baseCSS
      return (
        // TS seems to have trouble type-checking otherProps here.
        <Tag css={finalCSS} {...(otherProps as unknown)}>
          {children}
        </Tag>
      )
    }
  }
}
