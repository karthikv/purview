/* tslint:disable max-classes-per-file */
import { JSDOM } from "jsdom"

const { document } = new JSDOM().window
Object.assign(global, { document })

import * as WebSocket from "ws"
import * as http from "http"
import * as net from "net"
import AsyncQueue from "./async_queue"
import Purview, {
  InputEvent,
  ChangeEvent,
  KeyEvent,
  SubmitEvent,
} from "../src/purview"
import { parseHTML, concretize } from "../src/helpers"
import {
  UpdateMessage,
  EventMessage,
  SeenEventNamesMessage,
  ConnectedMessage,
  ServerMessage,
  ClientMessage,
} from "../src/types/ws"

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

  const [text, img] = p.children as [string, JSX.Element]
  expect(text).toBe("A paragraph")
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
  expect(select2.attributes).toEqual({
    autocomplete: "off",
    "data-controlled": true,
  })
  expect(select2.children).toHaveProperty("attributes", { selected: true })
})

test("createElem textarea", () => {
  const textarea1 = <textarea value="foo" />
  expect(textarea1.attributes).toEqual({})
  expect(textarea1.children).toEqual("foo")

  const textarea2 = <textarea forceValue="foo" />
  expect(textarea2.attributes).toEqual({
    autocomplete: "off",
    "data-controlled": true,
  })
  expect(textarea2.children).toEqual("foo")
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
    "data-controlled": true,
    checked: true,
  })

  const checkbox4 = <input type="checkbox" forceChecked={false} />
  expect(checkbox4.attributes).toEqual({
    type: "checkbox",
    autocomplete: "off",
    "data-controlled": true,
  })
})

test("createElem input", () => {
  const input1 = <input type="text" value="foo" />
  expect(input1.attributes).toEqual({ type: "text", value: "foo" })

  const input2 = <input type="text" forceValue="foo" />
  expect(input2.attributes).toEqual({
    type: "text",
    autocomplete: "off",
    "data-controlled": true,
    value: "foo",
  })
})

test("createElem intrinsic falsy attributes", () => {
  const props = { foo: false, bar: null, baz: undefined, class: "" }
  const div = <div {...props} />
  expect(div.attributes).toEqual({ class: "" })
})

test("createElem component falsy attributes", () => {
  const props = { foo: false, bar: null, baz: undefined, class: "" }
  class Foo extends Purview.Component<{}, {}> {
    render(): JSX.Element {
      return <div />
    }
  }

  const foo = <Foo {...props} />
  expect(foo.attributes).toEqual({
    foo: false,
    bar: null,
    baz: undefined,
    class: "",
  })
})

test("createElem key", () => {
  const div: JSX.Element<JSX.HTMLAttributes> = <div key="foo" />
  expect(div.attributes.key).toBeUndefined()
  expect((div.attributes as any)["data-key"]).toEqual("foo")
})

test("createElem ignoreChildren", () => {
  const div: JSX.Element<JSX.HTMLAttributes> = <div ignoreChildren={true} />
  expect(div.attributes.ignoreChildren).toBeUndefined()
  expect((div.attributes as any)["data-ignore-children"]).toEqual(true)
})

test("render simple", async () => {
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

  const p = parseHTML(await Purview.render(<Foo />))
  expect(p.childNodes[0].textContent).toEqual("A paragraph")
  expect(p.getAttribute("data-root")).toBe("true")

  const img = p.childNodes[1] as Element
  expect(img.getAttribute("src")).toEqual("foo")
  expect(img.getAttribute("class")).toEqual("bar")
})

test("render special content", async () => {
  class Foo extends Purview.Component<{}, {}> {
    render(): JSX.Element {
      return (
        <p>
          true: {true}, false: {false}, null: {null}, undefined: {undefined}
        </p>
      )
    }
  }

  const p = parseHTML(await Purview.render(<Foo />))
  expect(p.textContent).toBe("true: true, false: , null: , undefined: ")
})

test("render getInitialState", async () => {
  class Foo extends Purview.Component<{}, { text: string }> {
    async getInitialState(): Promise<{ text: string }> {
      // Simulate some work.
      await new Promise(resolve => setTimeout(resolve, 10))
      return { text: "foo" }
    }

    render(): JSX.Element {
      return <p>{this.state.text}</p>
    }
  }

  const p = parseHTML(await Purview.render(<Foo />))
  expect(p.textContent).toEqual("foo")
})

test("render custom children", async () => {
  class Foo extends Purview.Component<{ children: () => string }, {}> {
    render(): JSX.Element {
      return <p>{this.props.children()}</p>
    }
  }

  const p = parseHTML(await Purview.render(<Foo>{() => "foo"}</Foo>))
  expect(p.textContent).toEqual("foo")
})

test("render setState", async () => {
  let instance: Foo = null as any
  class Foo extends Purview.Component<{}, { text: string }> {
    state = { text: "hi" }

    constructor(props: {}) {
      super(props)
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

    const p = concretize(message.vNode)
    expect(p.textContent).toBe("hello")
    expect(p.getAttribute("data-root")).toBe("true")
  })
})

test("render event", async () => {
  class Foo extends Purview.Component<{}, { text: string }> {
    state = { text: "hi" }
    setText = () => this.setState({ text: "hello" })

    render(): JSX.Element {
      return <p onClick={this.setText}>{this.state.text}</p>
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    const event: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-click") as string,
    }
    conn.ws.send(JSON.stringify(event))

    const message = (await conn.messages.next()) as UpdateMessage
    expect(message.type).toBe("update")
    expect(message.componentID).toBe(conn.rootID)
    expect(concretize(message.vNode).textContent).toBe("hello")
  })
})

test("render event capture", async () => {
  class Foo extends Purview.Component<{}, { text: string }> {
    state = { text: "hi" }
    setText = () => this.setState({ text: "hello" })

    render(): JSX.Element {
      return <p onClickCapture={this.setText}>{this.state.text}</p>
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    const event: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-click-capture") as string,
    }
    conn.ws.send(JSON.stringify(event))

    const message = (await conn.messages.next()) as UpdateMessage
    expect(message.type).toBe("update")
    expect(message.componentID).toBe(conn.rootID)
    expect(concretize(message.vNode).textContent).toBe("hello")
  })
})

test("render input/change event", async () => {
  let inputValue: string
  let checkboxValue: boolean
  let changeValue: string[]

  class Foo extends Purview.Component<{}, {}> {
    state = {}

    handleInput = (event: InputEvent) => (inputValue = event.value)
    handleCheckbox = (event: InputEvent<boolean>) =>
      (checkboxValue = event.value)
    handleChange = (event: ChangeEvent<string[]>) => (changeValue = event.value)

    render(): JSX.Element {
      return (
        <div>
          <input onInput={this.handleInput} />
          <input type="checkbox" onInput={this.handleCheckbox} />
          <select onChange={this.handleChange} multiple={true}>
            <option>Foo</option>
            <option>Bar</option>
            <option>Baz</option>
          </select>
        </div>
      )
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    const invalidEvent1: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.children[0].getAttribute("data-input") as string,
      event: { value: 13 },
    }
    conn.ws.send(JSON.stringify(invalidEvent1))

    const invalidEvent2: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.children[1].getAttribute("data-input") as string,
      event: { value: ["Bar", "Baz"] },
    }
    conn.ws.send(JSON.stringify(invalidEvent2))

    const invalidEvent3: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.children[2].getAttribute("data-change") as string,
      event: { value: true },
    }
    conn.ws.send(JSON.stringify(invalidEvent3))

    // Wait for handlers to be called.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(inputValue).toBe(undefined)
    expect(checkboxValue).toBe(undefined)
    expect(changeValue).toEqual(undefined)

    const event1: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.children[0].getAttribute("data-input") as string,
      event: { value: "value" },
    }
    conn.ws.send(JSON.stringify(event1))

    const event2: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.children[1].getAttribute("data-input") as string,
      event: { value: true },
    }
    conn.ws.send(JSON.stringify(event2))

    const event3: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.children[2].getAttribute("data-change") as string,
      event: { value: ["Bar", "Baz"] },
    }
    conn.ws.send(JSON.stringify(event3))

    // Wait for handlers to be called.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(inputValue).toBe((event1.event as InputEvent).value)
    expect(checkboxValue).toBe((event2.event as InputEvent).value)
    expect(changeValue).toEqual((event3.event as ChangeEvent).value)
  })
})

test("render change event other element", async () => {
  let value: number
  class Foo extends Purview.Component<{}, {}> {
    state = {}
    handleChange = (event: ChangeEvent<any>) => (value = event.value)

    render(): JSX.Element {
      return <div onChange={this.handleChange} />
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    const invalidEvent: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-change") as string,
      event: { foo: 3 } as any,
    }
    conn.ws.send(JSON.stringify(invalidEvent))

    // Wait for handlers to be called.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(value).toBe(undefined)

    const event: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-change") as string,
      event: { value: 3 },
    }
    conn.ws.send(JSON.stringify(event))

    // Wait for handlers to be called.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(value).toBe((event.event as ChangeEvent).value)
  })
})

test("render keydown event", async () => {
  let key: string
  class Foo extends Purview.Component<{}, {}> {
    state = {}
    handleKeyDown = (event: KeyEvent) => (key = event.key)

    render(): JSX.Element {
      return <input onKeyDown={this.handleKeyDown} />
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    const invalidEvent: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-keydown") as string,
      event: { key: 13 as any },
    }
    conn.ws.send(JSON.stringify(invalidEvent))

    // Wait for handlers to be called.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(key).toBe(undefined)

    const event: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-keydown") as string,
      event: { key: "k" },
    }
    conn.ws.send(JSON.stringify(event))

    // Wait for handlers to be called.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(key).toBe((event.event as KeyEvent).key)
  })
})

test("render submit event", async () => {
  let fields: { [key: string]: any }
  class Foo extends Purview.Component<{}, {}> {
    state = {}
    handleSubmit = (event: SubmitEvent) => (fields = event.fields)

    render(): JSX.Element {
      return <form onSubmit={this.handleSubmit} />
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    const invalidEvent: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-submit") as string,
      event: { fields: true as any },
    }
    conn.ws.send(JSON.stringify(invalidEvent))

    // Wait for handlers to be called.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(fields).toEqual(undefined)

    const event: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-submit") as string,
      event: { fields: { foo: "hi", bar: 7, baz: ["hello"], other: true } },
    }
    conn.ws.send(JSON.stringify(event))

    // Wait for handlers to be called.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(fields).toEqual((event.event as SubmitEvent).fields)
  })
})

test("render retain state", async () => {
  class Foo extends Purview.Component<{}, { text: string }> {
    state = { text: "hi" }
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
      eventID: span.getAttribute("data-click") as string,
    }
    conn.ws.send(JSON.stringify(event1))

    const message1 = (await conn.messages.next()) as UpdateMessage
    expect(message1.type).toBe("update")
    expect(message1.componentID).toBe(span.getAttribute("data-component-id"))
    expect(concretize(message1.vNode).textContent).toBe("101")

    const event2: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-click") as string,
    }
    conn.ws.send(JSON.stringify(event2))

    const message2 = (await conn.messages.next()) as UpdateMessage
    expect(message2.type).toBe("update")
    expect(message2.componentID).toBe(conn.rootID)

    // 101 should be retained from the previous state update.
    const div = concretize(message2.vNode)
    expect((div.querySelector("p") as Element).textContent).toBe("hello")
    expect((div.querySelector("span") as Element).textContent).toBe("101")
  })
})

test("render directly nested", async () => {
  let foo: Foo = null as any
  class Foo extends Purview.Component<{}, { text: string }> {
    state = { text: "" }

    constructor(props: {}) {
      super(props)
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
    state = { count: 0 }

    constructor(props: {}) {
      super(props)
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

    const p1 = concretize(message1.vNode)
    expect(p1.getAttribute("data-component-id")).toBe(conn.rootID)
    expect(p1.textContent).toBe("1")

    await foo.setState({ text: "hello" })
    const message2 = (await conn.messages.next()) as UpdateMessage
    expect(message2.type).toBe("update")
    expect(message2.componentID).toBe(conn.rootID)

    const p2 = concretize(message2.vNode)
    expect(p2.getAttribute("data-component-id")).toBe(conn.rootID)
    expect(p2.textContent).toBe("hello")
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
    state = { on: false }

    constructor(props: {}) {
      super(props)
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
    state = { count: 0 }

    constructor(props: {}) {
      super(props)
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

test("event names", async () => {
  let instance: Foo = null as any

  class Foo extends Purview.Component<{}, { enabled: boolean }> {
    state = { enabled: false }

    constructor(props: {}) {
      super(props)
      instance = this
    }

    render(): JSX.Element {
      if (this.state.enabled) {
        return <input onKeyDown={() => null} />
      }
      return <input onChange={() => null} />
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    expect(conn.connectedMessage.newEventNames).toEqual(["change"])
    instance.setState({ enabled: true })

    const message1 = (await conn.messages.next()) as UpdateMessage
    expect(message1.type).toBe("update")
    expect(message1.componentID).toBe(conn.rootID)
    expect(message1.newEventNames).toEqual(["change", "keydown"])

    const seenEventNames: SeenEventNamesMessage = {
      type: "seenEventNames",
      seenEventNames: ["change"],
    }
    conn.ws.send(JSON.stringify(seenEventNames))

    // Must wait for seenEventNames to propagate to server.
    await new Promise(resolve => setTimeout(resolve, 25))
    instance.setState({ enabled: true })

    const message2 = (await conn.messages.next()) as UpdateMessage
    expect(message2.type).toBe("update")
    expect(message2.componentID).toBe(conn.rootID)
    expect(message2.newEventNames).toEqual(["keydown"])
  })
})

test("invalid event names", async () => {
  let instance: Foo = null as any

  class Foo extends Purview.Component<{}, { enabled: boolean }> {
    state = { enabled: false }

    constructor(props: {}) {
      super(props)
      instance = this
    }

    render(): JSX.Element {
      if (this.state.enabled) {
        return <input onKeyDown={() => null} />
      }
      return <input onChange={() => null} />
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    expect(conn.connectedMessage.newEventNames).toEqual(["change"])
    instance.setState({ enabled: true })

    const message1 = (await conn.messages.next()) as UpdateMessage
    expect(message1.type).toBe("update")
    expect(message1.componentID).toBe(conn.rootID)
    expect(message1.newEventNames).toEqual(["change", "keydown"])

    const seenEventNames: SeenEventNamesMessage = {
      type: "seenEventNames",
      seenEventNames: ["change", false] as any,
    }
    conn.ws.send(JSON.stringify(seenEventNames))

    // Must wait for seenEventNames to propagate to server.
    await new Promise(resolve => setTimeout(resolve, 25))
    instance.setState({ enabled: true })

    const message2 = (await conn.messages.next()) as UpdateMessage
    expect(message2.type).toBe("update")
    expect(message2.componentID).toBe(conn.rootID)
    expect(message2.newEventNames).toEqual(["change", "keydown"])
  })
})

test("dirty components", async () => {
  class Foo extends Purview.Component<{}, { text: string }> {
    state = { text: "foo" }

    constructor(props: {}) {
      super(props)

      // Update state right away, before the websocket connects. We should still
      // receive an update message thanks to our tracking of dirty components.
      setImmediate(() => this.setState({ text: "bar" }))
    }

    render(): JSX.Element {
      return <p>{this.state.text}</p>
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    const message = (await conn.messages.next()) as UpdateMessage
    expect(message.type).toBe("update")
    expect(message.componentID).toBe(conn.rootID)
    expect(concretize(message.vNode).textContent).toBe("bar")
  })
})

test("child map ordering", async () => {
  let foo: Foo
  class Foo extends Purview.Component<{}, {}> {
    state = {}

    constructor(props: {}) {
      super(props)
      foo = this
    }

    render(): JSX.Element {
      return (
        <div>
          <Bar key="first" />
          <Bar key="second" />
        </div>
      )
    }
  }

  let keyChanged = false
  let firstBar: Bar
  class Bar extends Purview.Component<{ key: string }, {}> {
    state = {}

    constructor(props: { key: string }) {
      super(props)
      if (props.key === "first") {
        firstBar = this
      }
    }

    componentWillReceiveProps(newProps: { key: string }): void {
      if (newProps.key !== this.props.key) {
        keyChanged = true
      }
    }

    render(): JSX.Element {
      return <div />
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    // Attempt to force reordering of the two <Bar /> elements in the child map
    // by locking the first.
    await firstBar._lock(async () => {
      foo.setState({})
      await new Promise(resolve => setTimeout(resolve, 25))
    })
    await conn.messages.next()

    // Now re-render and confirm the ordering hasn't changed.
    await foo.setState({})
    expect(keyChanged).toBe(false)
  })
})

test("render consistency", async () => {
  let foo: Foo
  class Foo extends Purview.Component<{}, { showBaz: boolean }> {
    state = { showBaz: false }

    constructor(props: {}) {
      super(props)
      foo = this
    }

    render(): JSX.Element {
      return (
        <div>
          <Bar />
          {this.state.showBaz && <Baz />}
        </div>
      )
    }
  }

  let bar: Bar
  class Bar extends Purview.Component<{}, { text: string }> {
    state = { text: "Bar" }

    constructor(props: {}) {
      super(props)
      bar = this
    }

    render(): JSX.Element {
      return <p>{this.state.text}</p>
    }
  }

  class Baz extends Purview.Component<{}, {}> {
    async getInitialState(): Promise<{}> {
      await new Promise(resolve => setTimeout(resolve, 25))
      return {}
    }

    render(): JSX.Element {
      return <div />
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    foo.setState({ showBaz: true })
    await new Promise(resolve => setTimeout(resolve, 10))
    bar.setState({ text: "Hi" })

    const p1 = conn.elem.querySelector("p")!
    const message1 = (await conn.messages.next()) as UpdateMessage
    expect(message1.type).toBe("update")
    expect(message1.componentID).toBe(p1.getAttribute("data-component-id"))

    const p2 = concretize(message1.vNode)
    expect(p2.textContent).toBe("Hi")

    const message2 = (await conn.messages.next()) as UpdateMessage
    expect(message2.type).toBe("update")
    expect(message2.componentID).toBe(conn.rootID)

    const p3 = concretize(message2.vNode).querySelector("p")!
    expect(p3.textContent).toBe("Hi")
  })
})

async function renderAndConnect<T>(
  jsxElem: JSX.Element,
  callback: (
    conn: {
      ws: WebSocket
      rootID: string
      elem: Element
      connectedMessage: ConnectedMessage
      messages: AsyncQueue<ServerMessage>
    },
  ) => Promise<T>,
): Promise<T> {
  const server = http.createServer()
  await new Promise(resolve => server.listen(resolve))

  Purview.handleWebSocket(server)
  const elem = parseHTML(await Purview.render(jsxElem))
  const id = elem.getAttribute("data-component-id")
  if (!id) {
    throw new Error(`Expected component ID, but got: ${id}`)
  }

  const addr = server.address() as net.AddressInfo
  const ws = new WebSocket(`ws://127.0.0.1:${addr.port}`)
  await new Promise(resolve => ws.addEventListener("open", resolve))

  const messages = new AsyncQueue<ServerMessage>()
  const connectedMessage = await new Promise<ConnectedMessage>(resolve => {
    ws.addEventListener("message", messageEvent => {
      const message = JSON.parse(messageEvent.data.toString())
      switch (message.type) {
        case "connected":
          resolve(message)
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
    result = await callback({
      ws,
      rootID: id,
      elem,
      connectedMessage,
      messages,
    })
  } finally {
    server.close()
    ws.close()
  }
  return result
}
