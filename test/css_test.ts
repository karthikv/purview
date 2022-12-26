import {
  css,
  CSSProperties,
  generateClass,
  generateRuleTemplate,
  generateRule,
  CLASS_PREFIX,
  RuleTemplate,
  getAtomicProperties,
  AtomicProperty,
} from "../src/css"

test("css no args", () => {
  expect(css()).toEqual({})
})

test("css empty object", () => {
  expect(css({})).toEqual({})
})

test("css pseudo empty object", () => {
  const cssProperties: CSSProperties = {
    ":hover": {},
  }
  expect(css(cssProperties)).toEqual(cssProperties)
})

test("css undefined", () => {
  expect(css({ color: undefined })).toStrictEqual({})
})

test("css pseudo undefined", () => {
  expect(css({ ":link": undefined })).toStrictEqual({})
})

test("css no-op", () => {
  const cssProperties: CSSProperties = {
    color: "black",
    letterSpacing: "1px",
    paddingLeft: "30rem",
  }
  expect(css(cssProperties)).toEqual(cssProperties)
})

test("css pseudo no-op", () => {
  const cssProperties: CSSProperties = {
    ":hover": {
      color: "black",
      letterSpacing: "1px",
    },
    ":link": {
      paddingLeft: "30rem",
    },
    backgroundColor: "red",
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

test("css pseudo simple", () => {
  const cssProperties: CSSProperties = {
    ":hover": {
      borderTop: "1px solid red",
      position: "fixed",
    },
  }
  expect(css(cssProperties)).toEqual({
    ":hover": {
      borderTopWidth: "1px",
      borderTopStyle: "solid",
      borderTopColor: "red",
      position: "fixed",
    },
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

test("css pseudo many expansions", () => {
  const cssProperties: CSSProperties = {
    ":active": {
      borderTop: "1px solid red",
      padding: "10px 7px",
    },
    ":visited": {
      margin: "5px",
    },
    flex: "1",
  }
  expect(css(cssProperties)).toEqual({
    ":active": {
      borderTopWidth: "1px",
      borderTopStyle: "solid",
      borderTopColor: "red",
      paddingTop: "10px",
      paddingRight: "7px",
      paddingBottom: "10px",
      paddingLeft: "7px",
    },
    ":visited": {
      marginTop: "5px",
      marginRight: "5px",
      marginBottom: "5px",
      marginLeft: "5px",
    },
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

test("css pseudo precedence", () => {
  const cssProperties: CSSProperties = {
    ":active": {
      marginLeft: "15px", // Overrides marginLeft above.
      margin: "10px 7px",
      // Overrides part of margin shorthand above.
      marginBottom: "3px",
    },
  }
  expect(css(cssProperties)).toEqual({
    ":active": {
      marginTop: "10px",
      marginRight: "7px",
      marginBottom: "3px",
      marginLeft: "7px",
    },
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

test("css pseudo multiple", () => {
  const cssProperties1: CSSProperties = {
    color: "black",
    letterSpacing: "1px",
    ":link": {
      paddingLeft: "30rem",
    },
  }
  const cssProperties2: CSSProperties = {
    ":link": {
      borderTop: "1px solid red",
      padding: "10px 7px",
    },
  }
  const cssProperties3: CSSProperties = {
    ":active": {
      margin: "15px",
    },
    ":link": {
      borderTopColor: "blue",
      // Overrides part of margin shorthand above.
      paddingBottom: "3px",
    },
    letterSpacing: "1px",
  }
  expect(css(cssProperties1, cssProperties2, cssProperties3)).toEqual({
    color: "black",
    ":link": {
      borderTopWidth: "1px",
      borderTopStyle: "solid",
      borderTopColor: "blue",
      paddingTop: "10px",
      paddingLeft: "7px",
      paddingBottom: "3px",
      paddingRight: "7px",
    },
    ":active": {
      marginTop: "15px",
      marginLeft: "15px",
      marginBottom: "15px",
      marginRight: "15px",
    },
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

test("generateRuleTemplate simple", () => {
  expect(generateRuleTemplate({ key: "color", value: "#333" })).toBe(
    " { color: #333 }",
  )
})

test("generateRuleTemplate simple pseudo", () => {
  expect(
    generateRuleTemplate({
      key: "color",
      value: "#333",
      pseudoClass: ":active",
    }),
  ).toBe(":active { color: #333 }")
})

test("generateRuleTemplate dashed rule", () => {
  expect(generateRuleTemplate({ key: "paddingLeft", value: "30px" })).toBe(
    " { padding-left: 30px }",
  )
})

test("generateRuleTemplate dashed rule pseudo", () => {
  expect(
    generateRuleTemplate({
      key: "paddingLeft",
      value: "30px",
      pseudoClass: ":link",
    }),
  ).toBe(":link { padding-left: 30px }")
})

test("generateRuleTemplate numeric", () => {
  expect(generateRuleTemplate({ key: "lineHeight", value: "3" })).toBe(
    " { line-height: 3 }",
  )
  expect(
    generateRuleTemplate({
      key: "letterSpacing",
      value: 0,
      pseudoClass: ":visited",
    }),
  ).toBe(":visited { letter-spacing: 0 }")
})

test("generateRuleTemplate invalid", () => {
  expect(() => generateRuleTemplate({ key: "foo" as any, value: 3 })).toThrow(
    /unknown property/i,
  )
  expect(() =>
    generateRuleTemplate({ key: "fontSize", value: "asdf" }),
  ).toThrow(/mismatch\s+syntax/i)
  expect(() =>
    generateRuleTemplate({ key: "lineHeight", value: "auto" }),
  ).toThrow(/mismatch\s+syntax/i)
  expect(() =>
    generateRuleTemplate({
      key: "letterSpacing",
      value: 0,
      pseudoClass: ":asdf" as any,
    }),
  ).toThrow(/Invalid\s+pseudo\s+class/i)
})

test("generateRuleTemplate cache", () => {
  const start1 = process.hrtime.bigint()
  const result1 = generateRuleTemplate({
    key: "backgroundColor",
    value: "green",
  })
  const time1 = process.hrtime.bigint() - start1

  const start2 = process.hrtime.bigint()
  const result2 = generateRuleTemplate({
    key: "backgroundColor",
    value: "green",
  })
  const time2 = process.hrtime.bigint() - start2

  const start3 = process.hrtime.bigint()
  const result3 = generateRuleTemplate({
    key: "backgroundColor",
    value: "green",
  })
  const time3 = process.hrtime.bigint() - start3

  // These values are in ns.
  expect(time1).toBeGreaterThan(450_000)
  expect(time2).toBeLessThan(400_000)
  // The LRU cache seems to perform much better on subsequent accesses.
  expect(time3).toBeLessThan(100_000)

  expect(result1).toBe(" { background-color: green }")
  expect(result2).toBe(" { background-color: green }")
  expect(result3).toBe(" { background-color: green }")
})

test("generateRule", () => {
  expect(generateRule("foo", " { margin-bottom: 0 }" as RuleTemplate)).toBe(
    ".foo { margin-bottom: 0 }",
  )
})

test("getAtomicProperties", () => {
  // tslint:disable-next-line no-object-literal-type-assertion
  const cssAttr = css({
    ":active": {
      borderTopWidth: "1px",
      borderTopStyle: "solid",
      borderTopColor: "red",
      paddingTop: "10px",
      paddingRight: "7px",
      paddingBottom: "10px",
      paddingLeft: "7px",
    },
    ":visited": {
      marginTop: "5px",
      marginRight: "5px",
      marginBottom: "5px",
      marginLeft: "5px",
    },
    flex: "1",
  })
  const aps: Array<AtomicProperty<any>> = [
    { key: "borderTopWidth", value: "1px", pseudoClass: ":active" },
    { key: "borderTopStyle", value: "solid", pseudoClass: ":active" },
    { key: "borderTopColor", value: "red", pseudoClass: ":active" },
    { key: "paddingTop", value: "10px", pseudoClass: ":active" },
    { key: "paddingRight", value: "7px", pseudoClass: ":active" },
    { key: "paddingBottom", value: "10px", pseudoClass: ":active" },
    { key: "paddingLeft", value: "7px", pseudoClass: ":active" },
    { key: "marginTop", value: "5px", pseudoClass: ":visited" },
    { key: "marginRight", value: "5px", pseudoClass: ":visited" },
    { key: "marginBottom", value: "5px", pseudoClass: ":visited" },
    { key: "marginLeft", value: "5px", pseudoClass: ":visited" },
    { key: "flexGrow", value: "1" },
  ]
  expect(getAtomicProperties(cssAttr)).toEqual(aps)
})
