import { JSDOM } from "jsdom"

const { document } = new JSDOM().window
Object.assign(global, { document })

import morph from "../src/morph"
import { parseHTML } from "../src/helpers"

test("morph", () => {
  const div = populate("<div>foo</div>")
  morph(div, parseHTML(`<p class="bar">Hello</p>`))

  const p = document.body.querySelector("p") as Element
  expect(p.getAttribute("class")).toBe("bar")
  expect(p.textContent).toBe("Hello")
})

test("morph checkbox", () => {
  const input = populate('<input type="checkbox" />') as HTMLInputElement
  input.checked = true
  morph(input, parseHTML(`<input type="checkbox" />`))

  const newInput = document.querySelector("input") as HTMLInputElement
  expect(newInput.checked).toBe(true)
})

test("morph text input value", () => {
  const input = populate('<input type="text" />') as HTMLInputElement
  input.value = "Hello"
  morph(input, parseHTML('<input type="text" value="Hey" />'))

  const newInput = document.querySelector("input") as HTMLInputElement
  expect(newInput.value).toBe("Hey")
})

test("morph select multiple", async () => {
  const select = populate(`
    <select multiple>
      <option>Foo</option>
      <option>Bar</option>
    </select>
  `) as HTMLSelectElement
  ;(select.children[0] as HTMLOptionElement).selected = true
  ;(select.children[1] as HTMLOptionElement).selected = true

  const to = parseHTML(`
    <select multiple>
      <option>Foo</option>
      <option>Bar</option>
      <option>Baz</option>
    </select>
  `)
  morph(select, to)

  const newSelect = document.body.querySelector("select") as Element
  expect((newSelect.children[0] as HTMLOptionElement).selected).toBe(true)
  expect((newSelect.children[1] as HTMLOptionElement).selected).toBe(true)
  expect((newSelect.children[2] as HTMLOptionElement).selected).toBe(false)
})

function populate(html: string): Element {
  document.body.innerHTML = ""
  const elem = parseHTML(html)
  document.body.appendChild(elem)
  return elem
}
