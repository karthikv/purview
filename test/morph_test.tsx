import { JSDOM } from "jsdom"

const { document, HTMLElement } = new JSDOM().window
Object.assign(global, { document, HTMLElement })

import Purview from "../src/purview"
import morph from "../src/morph"
import { toElem } from "../src/helpers"

test("morph", () => {
  const div = populate(<div>foo</div>)
  morph(div, toElem(<p class="bar">Hello</p>))

  const p = document.body.querySelector("p") as Element
  expect(p.getAttribute("class")).toBe("bar")
  expect(p.textContent).toBe("Hello")
})

test("morph checkbox", () => {
  const input = populate(<input type="checkbox" />) as HTMLInputElement
  input.checked = true
  morph(input, toElem(<input type="checkbox" />))

  const newInput = document.querySelector("input") as HTMLInputElement
  expect(newInput.checked).toBe(true)
})

test("morph text input value", () => {
  const input = populate(<input type="text" />) as HTMLInputElement
  input.value = "Hello"
  morph(input, toElem(<input type="text" forceValue="Hey" />))

  const newInput = document.querySelector("input") as HTMLInputElement
  expect(newInput.value).toBe("Hey")
})

test("morph select multiple", async () => {
  const select = populate(
    <select multiple>
      <option>Foo</option>
      <option>Bar</option>
    </select>,
  ) as HTMLSelectElement
  ;(select.children[0] as HTMLOptionElement).selected = true
  ;(select.children[1] as HTMLOptionElement).selected = true

  const to = toElem(
    <select multiple>
      <option>Foo</option>
      <option>Bar</option>
      <option>Baz</option>
    </select>,
  )
  morph(select, to)

  const newSelect = document.body.querySelector("select") as Element
  expect((newSelect.children[0] as HTMLOptionElement).selected).toBe(true)
  expect((newSelect.children[1] as HTMLOptionElement).selected).toBe(true)
  expect((newSelect.children[2] as HTMLOptionElement).selected).toBe(false)
})

test("morph key", async () => {
  const ul = populate(
    <ul>
      <li data-key="1">1</li>
      <li data-key="2">2</li>
      <li data-key="3">3</li>
    </ul>,
  )
  ;(ul.children[1] as any).original = true

  const to = toElem(
    <ul>
      <li data-key="2">2</li>
      <li data-key="3">3</li>
    </ul>,
  )
  morph(ul, to)

  // Because of its key, the li object shouldn't have changed.
  const li = document.body.querySelector("li[data-key='2']") as Element
  expect((li as any).original).toBe(true)
})

function populate(jsx: JSX.Element): Element {
  document.body.innerHTML = ""
  const elem = toElem(jsx)
  document.body.appendChild(elem)
  return elem
}
