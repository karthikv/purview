import { JSDOM } from "jsdom"

const { document, HTMLElement } = new JSDOM().window
Object.assign(global, { document, HTMLElement })

import Purview from "../src/purview"
import { initMorph, morph } from "../src/morph"
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

test("morph text input forceValue undefined", () => {
  const input = populate(<input type="text" />) as HTMLInputElement
  input.value = "Hello"
  morph(input, toElem(<input type="text" forceValue={undefined} />))

  const newInput = document.querySelector("input") as HTMLInputElement
  expect(newInput.value).toBe("Hello")
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

test("morph retains other changes", async () => {
  const div = populate(
    <div>
      <p>Hello</p>
      <a href="#">Link</a>
    </div>,
  )
  const span = document.createElement("span")
  span.textContent = "Bye"
  div.insertBefore(span, div.children[1])

  const to = toElem(
    <div>
      <p>Hello there</p>
      <a href="#">Link</a>
      <br />
    </div>,
  )
  morph(div, to)

  const tags = Array.from(div.children).map(c => c.nodeName.toLowerCase())
  expect(tags).toEqual(["p", "span", "a", "br"])
  expect(div.children[1].textContent).toBe("Bye")
})

test("morph ignoreChildren", () => {
  const div = populate(
    <div ignoreChildren={true}>
      <p>Hello</p>
    </div>,
  )

  const to = toElem(
    <div ignoreChildren={true}>
      <span>Span</span>
    </div>,
  )
  morph(div, to)

  const p = div.children[0]
  expect(p).toBeTruthy()
  expect(p.nodeName).toBe("P")
  expect(p.textContent).toBe("Hello")
})

function populate(jsx: JSX.Element): Element {
  const elem = toElem(jsx)
  document.body.innerHTML = ""
  document.body.appendChild(elem)
  initMorph(elem)
  return elem
}
