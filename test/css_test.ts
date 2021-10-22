import {
  css,
  CSSProperties,
  generateClass,
  generateProperty,
  generateRule,
  CLASS_PREFIX,
  PropertyText,
} from "../src/css"

test("css no args", () => {
  expect(css()).toEqual({})
})

test("css empty object", () => {
  expect(css({})).toEqual({})
})

test("css no-op", () => {
  const cssProperties: CSSProperties = {
    color: "black",
    letterSpacing: "1px",
    paddingLeft: "30rem",
  }
  expect(css(cssProperties)).toEqual(cssProperties)
})

test("css simple", () => {
  const cssProperties: CSSProperties = {
    borderTop: "1px solid red",
    position: "fixed",
  }
  expect(css(cssProperties)).toEqual({
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "red",
    position: "fixed",
  })
})

test("css many expansions", () => {
  const cssProperties: CSSProperties = {
    borderTop: "1px solid red",
    padding: "10px 7px",
    flex: "1",
  }
  expect(css(cssProperties)).toEqual({
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "red",
    paddingTop: "10px",
    paddingRight: "7px",
    paddingBottom: "10px",
    paddingLeft: "7px",
    flexGrow: "1",
  })
})

test("css precedence", () => {
  const cssProperties: CSSProperties = {
    marginLeft: "15px",
    // Overrides marginLeft above.
    margin: "10px 7px",
    // Overrides part of margin shorthand above.
    marginBottom: "3px",
  }
  expect(css(cssProperties)).toEqual({
    marginTop: "10px",
    marginRight: "7px",
    marginBottom: "3px",
    marginLeft: "7px",
  })
})

test("css multiple", () => {
  const cssProperties1: CSSProperties = {
    color: "black",
    letterSpacing: "1px",
    paddingLeft: "30rem",
  }
  const cssProperties2: CSSProperties = {
    borderTop: "1px solid red",
    padding: "10px 7px",
  }
  const cssProperties3: CSSProperties = {
    margin: "15px",
    borderTopColor: "blue",
    // Overrides part of margin shorthand above.
    paddingBottom: "3px",
    letterSpacing: "1px",
  }
  expect(css(cssProperties1, cssProperties2, cssProperties3)).toEqual({
    color: "black",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "blue",
    paddingTop: "10px",
    paddingLeft: "7px",
    paddingBottom: "3px",
    paddingRight: "7px",
    marginTop: "15px",
    marginLeft: "15px",
    marginBottom: "15px",
    marginRight: "15px",
    letterSpacing: "1px",
  })
})

test.each([
  [0, "a"],
  [1, "b"],
  [25, "z"],
  [26, "ba"],
  [35, "bj"],
  [738, "bck"],
  [1541, "chh"],
])(
  "generateClass (index: %s, className: %s)",
  (index: number, className: string) => {
    expect(generateClass(index)).toBe(CLASS_PREFIX + className)
  },
)

test("generateProperty simple", () => {
  expect(generateProperty("color", "#333")).toBe("color: #333")
})

test("generateProperty dashed rule", () => {
  expect(generateProperty("paddingLeft", "30px")).toBe("padding-left: 30px")
})

test("generateProperty numeric", () => {
  expect(generateProperty("lineHeight", 3)).toBe("line-height: 3")
  expect(generateProperty("letterSpacing", 0)).toBe("letter-spacing: 0")
})

test("generateProperty invalid", () => {
  expect(() => generateProperty("foo" as any, 3)).toThrow(/unknown property/i)
  expect(() => generateProperty("fontSize", "asdf")).toThrow(
    /mismatch\s+syntax/i,
  )
  expect(() => generateProperty("lineHeight", "auto")).toThrow(
    /mismatch\s+syntax/i,
  )
})

test("generateRule", () => {
  expect(generateRule("foo", "margin-bottom: 0" as PropertyText)).toBe(
    ".foo { margin-bottom: 0 }",
  )
})
