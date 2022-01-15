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

test("generateProperty cache", () => {
  const start1 = process.hrtime.bigint()
  const result1 = generateProperty("backgroundColor", "green")
  const time1 = process.hrtime.bigint() - start1

  const start2 = process.hrtime.bigint()
  const result2 = generateProperty("backgroundColor", "green")
  const time2 = process.hrtime.bigint() - start2

  const start3 = process.hrtime.bigint()
  const result3 = generateProperty("backgroundColor", "green")
  const time3 = process.hrtime.bigint() - start3

  // These values are in ns.
  expect(time1).toBeGreaterThan(700_000)
  expect(time2).toBeLessThan(400_000)
  // The LRU cache seems to perform much better on subsequent accesses.
  expect(time3).toBeLessThan(100_000)

  expect(result1).toBe("background-color: green")
  expect(result2).toBe("background-color: green")
  expect(result3).toBe("background-color: green")
})

test("generateRule", () => {
  expect(generateRule("foo", "margin-bottom: 0" as PropertyText)).toBe(
    ".foo { margin-bottom: 0 }",
  )
})
