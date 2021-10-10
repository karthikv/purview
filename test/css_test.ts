import { normalizeCSS, CSS, generateClass } from "../src/css"

test("normalizeCSS empty object", () => {
  expect(normalizeCSS({})).toEqual({})
})

test("normalizeCSS empty array", () => {
  expect(normalizeCSS([])).toEqual({})
})

test("normalizeCSS no-op", () => {
  const css: CSS = {
    color: "black",
    letterSpacing: "1px",
    paddingLeft: "30rem",
  }
  expect(normalizeCSS(css)).toEqual(css)
})

test("normalizeCSS simple", () => {
  const css: CSS = { borderTop: "1px solid red", position: "fixed" }
  expect(normalizeCSS(css)).toEqual({
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "red",
    position: "fixed",
  })
})

test("normalizeCSS many expansions", () => {
  const css: CSS = {
    borderTop: "1px solid red",
    padding: "10px 7px",
    flex: "1",
  }
  expect(normalizeCSS(css)).toEqual({
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

test("normalizeCSS precedence", () => {
  const css: CSS = {
    marginLeft: "15px",
    // Overrides marginLeft above.
    margin: "10px 7px",
    // Overrides part of margin shorthand above.
    marginBottom: "3px",
  }
  expect(normalizeCSS(css)).toEqual({
    marginTop: "10px",
    marginRight: "7px",
    marginBottom: "3px",
    marginLeft: "7px",
  })
})

test("normalizeCSS multiple", () => {
  const css1: CSS = {
    color: "black",
    letterSpacing: "1px",
    paddingLeft: "30rem",
  }
  const css2: CSS = {
    borderTop: "1px solid red",
    padding: "10px 7px",
  }
  const css3: CSS = {
    margin: "15px",
    borderTopColor: "blue",
    // Overrides part of margin shorthand above.
    paddingBottom: "3px",
    letterSpacing: "1px",
  }
  expect(normalizeCSS([css1, css2, css3])).toEqual({
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
    expect(generateClass(index)).toBe(className)
  },
)
