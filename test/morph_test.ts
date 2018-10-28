import { JSDOM } from "jsdom"

const { document } = new JSDOM().window
Object.assign(global, { document })

import morph from "../src/morph"

test("morph", () => {
  document.body.innerHTML = `<div>Foo</div>`
  const div = document.body.firstChild as Element

  const p = document.createElement("p")
  p.setAttribute("class", "bar")
  p.textContent = "Hello"
  morph(div, p)

  const elem = document.body.firstChild as Element
  expect(elem.nodeName).toBe("P")
  expect(elem.getAttribute("class")).toBe("bar")
  expect(elem.textContent).toBe("Hello")
})
