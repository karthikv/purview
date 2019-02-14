import Purview from "../src/purview"
import { toHTML } from "../src/to_html"
import { virtualize } from "../src/helpers"

test("simple html", () => {
  const html = jsxToHTML(<p class="foo">Foo</p>)
  expect(html).toBe('<p class="foo">Foo</p>')
})

test("escaping content", () => {
  const html = jsxToHTML(<p>{"<Foo>"}</p>)
  expect(html).toBe("<p>&lt;Foo&gt;</p>")
})

test("validating attributes", () => {
  const attrs = { id: "foo", "<foo>": 1, "some spaces": 2, bar: "bar" }
  const html = jsxToHTML(<p {...attrs} />)
  expect(html).toBe('<p id="foo" bar="bar"></p>')
})

test("void tag", () => {
  const html = jsxToHTML(<img src="foo" />)
  expect(html).toBe('<img src="foo">')
})

test("boolean attribute", () => {
  const html1 = jsxToHTML(<input autoFocus={true} />)
  expect(html1).toBe('<input autofocus="true">')

  const html2 = jsxToHTML(<input autoFocus={false} />)
  expect(html2).toBe("<input>")
})

test("raw elements", () => {
  const html1 = jsxToHTML(
    <script>{`if (3 < 4) { console.log("Foo " + '</script>' + 42) }`}</script>,
  )
  expect(html1).toBe(
    `<script>if (3 < 4) { console.log("Foo " + '<\\/script>' + 42) }</script>`,
  )

  const html2 = jsxToHTML(
    <style>{`#foo { background: '#fff'; font-family: "35px</style>" }`}</style>,
  )
  expect(html2).toBe(
    `<style>#foo { background: '#fff'; font-family: "35px<\\/style>" }</style>`,
  )
})

test("nested combination", () => {
  const anchorAttrs = {
    "bad attr": "hi",
    other: 2,
    "something-else": true,
    "><><": "value",
  }
  const html = jsxToHTML(
    <div id="wrapper">
      <section>
        <img {...anchorAttrs} />
        <input type="radio" value={1} disabled={false} />
      </section>
      <span>{'Foo & "Bar"'}</span>
    </div>,
  )
  expect(html).toBe(
    '<div id="wrapper"><section><img other="2" something-else="true"><input type="radio" value="1"></section><span>Foo &amp; &quot;Bar&quot;</span></div>',
  )
})

function jsxToHTML(jsx: JSX.Element): string {
  return toHTML(virtualize(jsx))
}
