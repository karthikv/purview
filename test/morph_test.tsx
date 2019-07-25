import { JSDOM } from "jsdom"

const { document, HTMLElement } = new JSDOM().window
Object.assign(global, { document, HTMLElement })

import Purview from "../src/purview"
import { initMorph, morph } from "../src/morph"
import { virtualize, parseHTML, concretize } from "../src/helpers"

test("morph", () => {
  const div = populate(<div>foo</div>)
  morph(div, virtualize(<p class="bar">Hello</p>))

  const p = document.body.querySelector("p") as Element
  expect(p.getAttribute("class")).toBe("bar")
  expect(p.textContent).toBe("Hello")
})

test("morph checkbox", () => {
  const input = populate(<input type="checkbox" />) as HTMLInputElement
  input.checked = true
  morph(input, virtualize(<input type="checkbox" />))

  const newInput = document.querySelector("input") as HTMLInputElement
  expect(newInput.checked).toBe(true)
})

test("morph text input value", () => {
  const input = populate(<input type="text" />) as HTMLInputElement
  input.value = "Hello"

  jest.useFakeTimers()
  morph(input, virtualize(<input type="text" value="Hey" />))
  jest.runAllTimers()

  const newInput = document.querySelector("input") as HTMLInputElement
  expect(newInput.value).toBe("Hey")
})

test("morph text input value undefined", () => {
  const input = populate(<input type="text" />) as HTMLInputElement
  input.value = "Hello"

  jest.useFakeTimers()
  morph(input, virtualize(<input type="text" value={undefined} />))
  jest.runAllTimers()

  const newInput = document.querySelector("input") as HTMLInputElement
  expect(newInput.value).toBe("Hello")
})

test("morph option selected", async () => {
  const select = populate(
    <select>
      <optgroup>
        <option>Foo</option>
      </optgroup>
      <option selected>Bar</option>
      <option>Baz</option>
    </select>,
  ) as HTMLInputElement

  // Simulate user selecting an option.
  ;(select.children[0].children[0] as HTMLOptionElement).selected = true
  ;(select.children[1] as HTMLOptionElement).selected = false
  expect(document.querySelector("select")!.value).toBe("Foo")

  morph(
    select,
    virtualize(
      <select>
        <optgroup>
          <option>Foo</option>
        </optgroup>
        <option selected>Bar</option>
        <option>Baz</option>
      </select>,
    ),
  )
  expect(document.querySelector("select")!.value).toBe("Bar")
})

test("morph select multiple", async () => {
  const select = populate(
    <select multiple>
      <option>Foo</option>
      <option>Bar</option>
    </select>,
  ) as HTMLSelectElement

  // Simulate user selecting multiple options.
  ;(select.children[0] as HTMLOptionElement).selected = true
  ;(select.children[1] as HTMLOptionElement).selected = true

  const to = virtualize(
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

  const to = virtualize(
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

  const to = virtualize(
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

  const to = virtualize(
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

test("morph nested", () => {
  const div = populate(
    <div>
      <ul>
        <li />
      </ul>
    </div>,
  )

  const li = div.querySelector("li")!
  morph(li, virtualize(<li>Foo</li>))
  morph(li, virtualize(<li>Foo</li>))
  expect(li.textContent).toBe("Foo")
})

test("morph first child", () => {
  const div = populate(
    <div>
      <p>Foo</p>
    </div>,
  )
  morph(div.children[0], virtualize(<p />))

  const to = virtualize(
    <div>
      <p>Bar</p>
    </div>,
  )
  morph(div, to)

  const p = div.children[0]
  expect(p.nodeName).toBe("P")
  expect(p.textContent).toBe("Bar")
})

test("morph id doesn't create node", () => {
  const div = populate(
    <div>
      <p id="foo">Foo</p>
    </div>,
  )
  const p = div.children[0]
  ;(p as any).original = true

  morph(p, virtualize(<p id="bar">Bar</p>))

  const newP = div.children[0]
  expect((newP as any).original).toBe(true)
  expect((newP as any).getAttribute("id")).toBe("bar")
  expect((newP as any).textContent).toBe("Bar")
})

test("morph class doesn't create node", () => {
  const div = populate(
    <div>
      <p class="foo">Foo</p>
    </div>,
  )
  const p = div.children[0]
  ;(p as any).original = true

  morph(p, virtualize(<p class="bar">Bar</p>))

  const newP = div.children[0]
  expect((newP as any).original).toBe(true)
  expect((newP as any).getAttribute("class")).toBe("bar")
  expect((newP as any).textContent).toBe("Bar")
})

// Many methods of parsing HTML fail with tds, since they're required to be
// inside tr elements.
test("parseHTML td", () => {
  const td = parseHTML("<td>foo</td>")
  expect(td.nodeName).toBe("TD")
  expect(td.textContent).toBe("foo")
})

// Snabbdom may replace an element if the vNode's attribute case is different.
test("virtualize lowercase attributes", () => {
  const vNode = virtualize(<input autoFocus={true} />)
  expect(vNode.data.attrs).toEqual({ autofocus: true })
})

function populate(jsx: JSX.Element): Element {
  const elem = concretize(virtualize(jsx), document)
  document.body.innerHTML = ""
  document.body.appendChild(elem)
  initMorph(elem)
  return elem
}
