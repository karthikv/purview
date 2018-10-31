/* tslint:disable max-classes-per-file */
import { JSDOM } from "jsdom"

const { document } = new JSDOM().window
Object.assign(global, { document })

import * as WebSocket from "ws"
import * as http from "http"
import * as net from "net"
import AsyncQueue from "./async_queue"
import Purview from "../src/purview"
import { parseHTML } from "../src/helpers"

test("createElem", () => {
  const p = (
    <p>
      A paragraph
      <img src="foo" class="bar" />
    </p>
  )
  expect(p.nodeName).toBe("p")
  expect(p.attributes).toEqual({})
  expect(p.children).toHaveLength(2)
  expect(p.children[0]).toBe("A paragraph")

  const img = p.children[1] as JSX.Element
  expect(img.nodeName).toBe("img")
  expect(img.attributes).toEqual({ src: "foo", class: "bar" })
  expect(img.children).toEqual([])
})

test("createElem select", () => {
  const select1 = (
    <select>
      <option selected>First</option>
    </select>
  )
  expect(select1.attributes).toEqual({})

  const select2 = (
    <select>
      <option forceSelected>First</option>
    </select>
  )
  expect(select2.attributes).toEqual({ autocomplete: "off" })
  expect(select2.children[0]).toHaveProperty("attributes", { selected: true })
})

test("createElem textarea", () => {
  const textarea1 = <textarea value="foo" />
  expect(textarea1.attributes).toEqual({})
  expect(textarea1.children).toEqual(["foo"])

  const textarea2 = <textarea forceValue="foo" />
  expect(textarea2.attributes).toEqual({ autocomplete: "off" })
  expect(textarea2.children).toEqual(["foo"])
})

test("createElem checkbox", () => {
  const checkbox1 = <input type="checkbox" checked />
  expect(checkbox1.attributes).toEqual({ type: "checkbox", checked: true })

  const checkbox2 = <input type="checkbox" checked={false} />
  expect(checkbox2.attributes).toEqual({ type: "checkbox" })

  const checkbox3 = <input type="checkbox" forceChecked />
  expect(checkbox3.attributes).toEqual({
    type: "checkbox",
    autocomplete: "off",
    checked: true,
  })

  const checkbox4 = <input type="checkbox" forceChecked={false} />
  expect(checkbox4.attributes).toEqual({
    type: "checkbox",
    autocomplete: "off",
  })
})

test("createElem input", () => {
  const input1 = <input type="text" value="foo" />
  expect(input1.attributes).toEqual({ type: "text", value: "foo" })

  const input2 = <input type="text" forceValue="foo" />
  expect(input2.attributes).toEqual({
    type: "text",
    autocomplete: "off",
    value: "foo",
  })
})

test("createElem falsy attributes", () => {
  const props = { foo: false, bar: null, baz: undefined, class: "" }
  const div = <div {...props} />
  expect(div.attributes).toEqual({ class: "" })
})

test("render simple", () => {
  class Foo extends Purview.Component<{}, {}> {
    render(): JSX.Element {
      return (
        <p>
          A paragraph
          <img src="foo" class="bar" />
        </p>
      )
    }
  }

  const p = parseHTML(Purview.render(<Foo />))
  expect(p.childNodes[0].textContent).toEqual("A paragraph")
  expect(p.getAttribute("data-root")).toBe("true")

  const img = p.childNodes[1] as Element
  expect(img.getAttribute("src")).toEqual("foo")
  expect(img.getAttribute("class")).toEqual("bar")
})

test("render setState", async () => {
  let instance: Foo = null as any
  class Foo extends Purview.Component<{}, { text: string }> {
    constructor(props: {}) {
      super(props)
      this.state = { text: "hi" }
      instance = this
    }

    render(): JSX.Element {
      return <p>{this.state.text}</p>
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    await instance.setState({ text: "hello" })

    const message = (await conn.messages.next()) as UpdateMessage
    expect(message.type).toBe("update")
    expect(message.componentID).toBe(conn.rootID)

    const p = parseHTML(message.html)
    expect(p.textContent).toBe("hello")
    expect(p.getAttribute("data-root")).toBe("true")
  })
})

test("render DOM event", async () => {
  class Foo extends Purview.Component<{}, { text: string }> {
    constructor(props: {}) {
      super(props)
      this.state = { text: "hi" }
    }

    setText = () => {
      this.setState({ text: "hello" })
    }

    render(): JSX.Element {
      return <p onClick={this.setText}>{this.state.text}</p>
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    const event: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-onclick") as string,
    }
    conn.ws.send(JSON.stringify(event))

    const message = (await conn.messages.next()) as UpdateMessage
    expect(message.type).toBe("update")
    expect(message.componentID).toBe(conn.rootID)
    expect(parseHTML(message.html).textContent).toBe("hello")
  })
})

test("render retain state", async () => {
  class Foo extends Purview.Component<{}, { text: string }> {
    constructor(props: {}) {
      super(props)
      this.state = { text: "hi" }
    }

    setText = () => this.setState({ text: "hello" })

    render(): JSX.Element {
      return (
        <div onClick={this.setText}>
          <p>{this.state.text}</p>
          <Bar initialCount={100} />
        </div>
      )
    }
  }

  class Bar extends Purview.Component<
    { initialCount: number },
    { count: number }
  > {
    constructor(props: { initialCount: number }) {
      super(props)
      this.state = { count: props.initialCount }
    }

    increment = () => this.setState(state => ({ count: state.count + 1 }))

    render(): JSX.Element {
      return <span onClick={this.increment}>{this.state.count}</span>
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    const span = conn.elem.querySelector("span") as Element
    const event1: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: span.getAttribute("data-onclick") as string,
    }
    conn.ws.send(JSON.stringify(event1))

    const message1 = (await conn.messages.next()) as UpdateMessage
    expect(message1.type).toBe("update")
    expect(message1.componentID).toBe(span.getAttribute("data-component-id"))
    expect(parseHTML(message1.html).textContent).toBe("101")

    const event2: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-onclick") as string,
    }
    conn.ws.send(JSON.stringify(event2))

    const message2 = (await conn.messages.next()) as UpdateMessage
    expect(message2.type).toBe("update")
    expect(message2.componentID).toBe(conn.rootID)

    // 101 should be retained from the previous state update.
    const div = parseHTML(message2.html)
    expect((div.querySelector("p") as Element).textContent).toBe("hello")
    expect((div.querySelector("span") as Element).textContent).toBe("101")
  })
})

test("render directly nested", async () => {
  let foo: Foo = null as any
  class Foo extends Purview.Component<{}, { text: string }> {
    constructor(props: {}) {
      super(props)
      this.state = { text: "" }
      foo = this
    }

    render(): JSX.Element {
      if (this.state.text) {
        return <p>{this.state.text}</p>
      } else {
        return <Bar />
      }
    }
  }

  let bar: Bar = null as any
  class Bar extends Purview.Component<{}, { count: number }> {
    constructor(props: {}) {
      super(props)
      this.state = { count: 0 }
      bar = this
    }

    render(): JSX.Element {
      return <p>{this.state.count}</p>
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    await bar.setState(state => ({ count: state.count + 1 }))
    const message1 = (await conn.messages.next()) as UpdateMessage
    expect(message1.type).toBe("update")
    // Since Foo and Bar should share the same component ID.
    expect(message1.componentID).toBe(conn.rootID)
    expect(parseHTML(message1.html).textContent).toBe("1")

    await foo.setState({ text: "hello" })
    const message2 = (await conn.messages.next()) as UpdateMessage
    expect(message2.type).toBe("update")
    expect(message2.componentID).toBe(conn.rootID)
    expect(parseHTML(message2.html).textContent).toBe("hello")
  })
})

test("componentDidMount", async () => {
  let mounted = false
  class Foo extends Purview.Component<{}, { text: string }> {
    componentDidMount(): void {
      mounted = true
    }

    render(): JSX.Element {
      return <div />
    }
  }

  expect(mounted).toBe(false)
  await renderAndConnect(<Foo />, async () => {
    expect(mounted).toBe(true)
  })
})

test("nested mount cycle", async () => {
  let instance: Foo = null as any
  class Foo extends Purview.Component<{}, { on: boolean }> {
    constructor(props: {}) {
      super(props)
      this.state = { on: false }
      instance = this
    }

    render(): JSX.Element {
      if (this.state.on) {
        return <Bar />
      } else {
        return <p>Foo</p>
      }
    }
  }

  class Bar extends Purview.Component<{}, {}> {
    render(): JSX.Element {
      return <Baz />
    }
  }

  // We use counts instead of booleans to ensure we don't call mount/unmount
  // multiple times.
  let mountCount = 0
  let unmountCount = 0

  class Baz extends Purview.Component<{}, {}> {
    componentDidMount(): void {
      mountCount++
    }

    componentWillUnmount(): void {
      unmountCount++
    }

    render(): JSX.Element {
      return <p>Baz</p>
    }
  }

  await renderAndConnect(<Foo />, async () => {
    expect(mountCount).toBe(0)
    expect(unmountCount).toBe(0)

    await instance.setState({ on: true })
    expect(mountCount).toBe(1)
    expect(unmountCount).toBe(0)

    await instance.setState({ on: false })
    expect(mountCount).toBe(1)
    expect(unmountCount).toBe(1)
  })
})

test("componentWillUnmount", async () => {
  let unmounted = false
  class Foo extends Purview.Component<{}, { text: string }> {
    componentWillUnmount(): void {
      unmounted = true
    }

    render(): JSX.Element {
      return <div />
    }
  }

  await renderAndConnect(<Foo />, async () => {
    expect(unmounted).toBe(false)
  })

  // Must wait for close to propagate to server.
  await new Promise(resolve => setTimeout(resolve, 25))
  expect(unmounted).toBe(true)
})

test("componentWillReceiveProps", async () => {
  let instance: Foo = null as any
  let receivedProps: { count: number } | null = null

  class Foo extends Purview.Component<{}, { count: number }> {
    constructor(props: {}) {
      super(props)
      this.state = { count: 0 }
      instance = this
    }

    render(): JSX.Element {
      return <Bar count={1} />
    }
  }

  class Bar extends Purview.Component<{ count: number }, {}> {
    componentWillReceiveProps(props: { count: number }): void {
      receivedProps = props
    }

    render(): JSX.Element {
      return <p>{this.props.count}</p>
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    expect(receivedProps).toBe(null)
    instance.setState({ count: 1 })
    await conn.messages.next()
    expect(receivedProps).toEqual({ count: 1, children: [] })
  })
})

async function renderAndConnect<T>(
  jsxElem: JSX.Element,
  callback: (
    conn: {
      ws: WebSocket
      rootID: string
      elem: Element
      messages: AsyncQueue<ServerMessage>
    },
  ) => Promise<T>,
): Promise<T> {
  const server = http.createServer()
  await new Promise(resolve => server.listen(resolve))

  Purview.handleWebSocket(server)
  const elem = parseHTML(Purview.render(jsxElem))
  const id = elem.getAttribute("data-component-id")
  if (!id) {
    throw new Error(`Expected component ID, but got: ${id}`)
  }

  const addr = server.address() as net.AddressInfo
  const ws = new WebSocket(`ws://127.0.0.1:${addr.port}`)
  await new Promise(resolve => ws.addEventListener("open", resolve))

  const messages = new AsyncQueue<ServerMessage>()
  await new Promise(resolve => {
    ws.addEventListener("message", messageEvent => {
      const message = JSON.parse(messageEvent.data.toString())
      switch (message.type) {
        case "connected":
          resolve()
          break

        default:
          messages.push(message)
      }
    })

    const connect: ClientMessage = {
      type: "connect",
      rootIDs: [id],
    }
    ws.send(JSON.stringify(connect))
  })

  let result
  try {
    result = await callback({ ws, rootID: id, elem, messages })
  } finally {
    server.close()
    ws.close()
  }
  return result
}
