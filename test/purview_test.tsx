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
  ServerMessage,
  ClientMessage,
} from "../src/types/ws"
import { MAX_SET_STATE_AFTER_UNMOUNT } from "../src/component"

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
      <option defaultSelected>First</option>
    </select>
  )
  expect(select1.attributes).toEqual({})
  expect(select1.children).toHaveProperty("attributes", { selected: true })

  const select2 = (
    <select>
      <option selected>First</option>
    </select>
  )
  expect(select2.attributes).toEqual({ "data-controlled": true })
  expect(select2.children).toHaveProperty("attributes", {
    selected: true,
    "data-controlled": true,
  })

  const select3 = (
    <select>
      <optgroup>
        <option selected>First</option>
      </optgroup>
    </select>
  )
  expect(select3.attributes).toEqual({ "data-controlled": true })
  expect((select3.children as JSX.Element).children).toHaveProperty(
    "attributes",
    { selected: true, "data-controlled": true },
  )

  const select4 = (
    <select>
      <option selected={undefined}>First</option>
    </select>
  )
  expect(select4.attributes).toEqual({})
  expect(select4.children).toHaveProperty("attributes", {})
})

test("createElem textarea", () => {
  const textarea1 = <textarea defaultValue="foo" />
  expect(textarea1.attributes).toEqual({})
  expect(textarea1.children).toEqual("foo")

  const textarea2 = <textarea value="foo" />
  expect(textarea2.attributes).toEqual({ "data-controlled": true })
  expect(textarea2.children).toEqual("foo")

  const textarea3 = <textarea value={undefined} />
  expect(textarea3.attributes).toEqual({})
  expect(textarea3.children).toEqual([])
})

test("createElem checkbox", () => {
  const checkbox1 = <input type="checkbox" defaultChecked />
  expect(checkbox1.attributes).toEqual({ type: "checkbox", checked: true })

  const checkbox2 = <input type="checkbox" defaultChecked={false} />
  expect(checkbox2.attributes).toEqual({ type: "checkbox" })

  const checkbox3 = <input type="checkbox" checked />
  expect(checkbox3.attributes).toEqual({
    type: "checkbox",
    "data-controlled": true,
    checked: true,
  })

  const checkbox4 = <input type="checkbox" checked={false} />
  expect(checkbox4.attributes).toEqual({
    type: "checkbox",
    "data-controlled": true,
  })

  const checkbox5 = <input type="checkbox" checked={undefined} />
  expect(checkbox5.attributes).toEqual({ type: "checkbox" })
})

test("createElem input", () => {
  const input1 = <input type="text" defaultValue="foo" />
  expect(input1.attributes).toEqual({ type: "text", value: "foo" })

  const input2 = <input type="text" value="foo" />
  expect(input2.attributes).toEqual({
    type: "text",
    "data-controlled": true,
    value: "foo",
  })

  const input3 = <input type="text" value={undefined} />
  expect(input3.attributes).toEqual({ type: "text" })
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

test("createElem component defaultValue", () => {
  class Foo extends Purview.Component<{ defaultValue: string }, {}> {
    render(): JSX.Element {
      return <p>{this.props.defaultValue}</p>
    }
  }

  // The default value *should not* be set as the value attribute. We must not
  // treat a component like a text input.
  const foo = <Foo defaultValue="foo" />
  expect(foo.attributes).toEqual({ defaultValue: "foo" })
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

  const p = parseHTML(await Purview.render(<Foo />, {} as any))
  expect(p.childNodes[0].textContent).toEqual("A paragraph")
  expect(p.hasAttribute("data-root")).toBe(true)

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

  const p = parseHTML(await Purview.render(<Foo />, {} as any))
  expect(p.textContent).toBe("true: true, false: , null: , undefined: ")
})

// Snabbdom may replace an element if the vNode's attribute case is different.
test("render lowercase attributes", async () => {
  let instance: Foo
  class Foo extends Purview.Component<{}, {}> {
    constructor(props: {}) {
      super(props)
      instance = this
    }

    render(): JSX.Element {
      return <select autoComplete="on" />
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    await instance.setState({})

    const message = await conn.messages.next()
    expect(message.type).toBe("update")
    expect(message.pNode.data.attrs).toHaveProperty("autocomplete", "on")
    expect(message.componentID).toBe(conn.rootID)
  })
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

  const p = parseHTML(await Purview.render(<Foo />, {} as any))
  expect(p.textContent).toEqual("foo")
})

test("render custom children", async () => {
  class Foo extends Purview.Component<{ children: () => string }, {}> {
    render(): JSX.Element {
      return <p>{this.props.children()}</p>
    }
  }

  const p = parseHTML(await Purview.render(<Foo>{() => "foo"}</Foo>, {} as any))
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

    const message = await conn.messages.next()
    expect(message.type).toBe("update")
    expect(message.componentID).toBe(conn.rootID)

    const p = concretize(message.pNode)
    expect(p.textContent).toBe("hello")
    expect(p.hasAttribute("data-root")).toBe(true)
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

    const message = await conn.messages.next()
    expect(message.type).toBe("update")
    expect(message.componentID).toBe(conn.rootID)
    expect(concretize(message.pNode).textContent).toBe("hello")
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

    const message = await conn.messages.next()
    expect(message.type).toBe("update")
    expect(message.componentID).toBe(conn.rootID)
    expect(concretize(message.pNode).textContent).toBe("hello")
  })
})

test("render input/change event", async () => {
  let inputEvent: InputEvent
  let checkboxEvent: InputEvent<boolean>
  let selectEvent: ChangeEvent<string[]>

  class Foo extends Purview.Component<{}, {}> {
    state = {}

    handleInput = (event: InputEvent) => (inputEvent = event)
    handleCheckbox = (event: InputEvent<boolean>) => (checkboxEvent = event)
    handleSelect = (event: ChangeEvent<string[]>) => (selectEvent = event)

    render(): JSX.Element {
      return (
        <div>
          <input onInput={this.handleInput} />
          <input type="checkbox" onInput={this.handleCheckbox} />
          <select onChange={this.handleSelect} multiple={true}>
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
      event: { name: "foo", value: 13 },
    }
    conn.ws.send(JSON.stringify(invalidEvent1))

    const invalidEvent2: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.children[1].getAttribute("data-input") as string,
      event: { name: "bar", value: ["Bar", "Baz"] },
    }
    conn.ws.send(JSON.stringify(invalidEvent2))

    const invalidEvent3: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.children[2].getAttribute("data-change") as string,
      event: { name: "baz", value: true },
    }
    conn.ws.send(JSON.stringify(invalidEvent3))

    const invalidEvent4: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.children[0].getAttribute("data-input") as string,
      event: { name: null as any, value: "foo" },
    }
    conn.ws.send(JSON.stringify(invalidEvent4))

    // tslint:disable no-object-literal-type-assertion
    const invalidEvent5: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.children[0].getAttribute("data-input") as string,
      event: { name: "foo", value: "foo", other: 1 } as InputEvent,
    }
    conn.ws.send(JSON.stringify(invalidEvent5))

    const invalidEvent6: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.children[0].getAttribute("data-input") as string,
      event: { name: "foo", value: "foo" },
      other: 1,
    } as EventMessage
    // tslint:enable no-object-literal-type-assertion
    conn.ws.send(JSON.stringify(invalidEvent6))

    // Wait for handlers to be called.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(inputEvent).toBe(undefined)
    expect(checkboxEvent).toBe(undefined)
    expect(selectEvent).toBe(undefined)

    const event1: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.children[0].getAttribute("data-input") as string,
      event: { name: "", value: "value" },
    }
    conn.ws.send(JSON.stringify(event1))

    const event2: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.children[1].getAttribute("data-input") as string,
      event: { name: "foo", value: true },
    }
    conn.ws.send(JSON.stringify(event2))

    const event3: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.children[2].getAttribute("data-change") as string,
      event: { name: "bar", value: ["Bar", "Baz"] },
    }
    conn.ws.send(JSON.stringify(event3))

    // Wait for handlers to be called.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(inputEvent).toEqual(event1.event)
    expect(checkboxEvent).toEqual(event2.event)
    expect(selectEvent).toEqual(event3.event)
  })
})

test("render change event other element", async () => {
  let changeEvent: ChangeEvent<any>
  class Foo extends Purview.Component<{}, {}> {
    state = {}
    handleChange = (event: ChangeEvent<any>) => (changeEvent = event)

    render(): JSX.Element {
      return <div onChange={this.handleChange} />
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    const invalidEvent: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-change") as string,
      event: { name: "", foo: 3 } as any,
    }
    conn.ws.send(JSON.stringify(invalidEvent))

    // Wait for handlers to be called.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(changeEvent).toBe(undefined)

    const event: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-change") as string,
      event: { name: "foo", value: 3 },
    }
    conn.ws.send(JSON.stringify(event))

    // Wait for handlers to be called.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(changeEvent).toEqual(event.event)
  })
})

test("render keydown event", async () => {
  let keyEvent: KeyEvent
  class Foo extends Purview.Component<{}, {}> {
    state = {}
    handleKeyDown = (event: KeyEvent) => (keyEvent = event)

    render(): JSX.Element {
      return <input onKeyDown={this.handleKeyDown} />
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    const invalidEvent: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-keydown") as string,
      event: { name: "", key: 13 as any },
    }
    conn.ws.send(JSON.stringify(invalidEvent))

    // Wait for handlers to be called.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(keyEvent).toBe(undefined)

    const event: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-keydown") as string,
      event: { name: "foo", key: "k" },
    }
    conn.ws.send(JSON.stringify(event))

    // Wait for handlers to be called.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(keyEvent).toEqual(event.event)
  })
})

test("render submit event", async () => {
  let fields: Record<string, unknown>
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

    const message1 = await conn.messages.next()
    expect(message1.type).toBe("update")
    expect(message1.componentID).toBe(span.getAttribute("data-component-id"))
    expect(concretize(message1.pNode).textContent).toBe("101")

    const event2: EventMessage = {
      type: "event",
      rootID: conn.rootID,
      eventID: conn.elem.getAttribute("data-click") as string,
    }
    conn.ws.send(JSON.stringify(event2))

    const message2 = await conn.messages.next()
    expect(message2.type).toBe("update")
    expect(message2.componentID).toBe(conn.rootID)

    // 101 should be retained from the previous state update.
    const div = concretize(message2.pNode)
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
    const message1 = await conn.messages.next()
    expect(message1.type).toBe("update")
    // Since Foo and Bar should share the same component ID.
    expect(message1.componentID).toBe(conn.rootID)

    const p1 = concretize(message1.pNode)
    expect(p1.getAttribute("data-component-id")).toBe(conn.rootID)
    expect(p1.hasAttribute("data-root")).toBe(true)
    expect(p1.textContent).toBe("1")

    await foo.setState({ text: "hello" })
    const message2 = await conn.messages.next()
    expect(message2.type).toBe("update")
    expect(message2.componentID).toBe(conn.rootID)

    const p2 = concretize(message2.pNode)
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

test("locked mount cycle", async () => {
  let fooMountCount = 0
  let barMountCount = 0
  let fooUnmountCount = 0
  let barUnmountCount = 0
  let fooInstance: Foo
  let barInstance: Bar

  class Foo extends Purview.Component<{}, {}> {
    constructor(props: {}) {
      super(props)
      fooInstance = this
    }

    componentDidMount(): void {
      fooMountCount++
    }

    componentWillUnmount(): void {
      fooUnmountCount++
    }

    render(): JSX.Element {
      return <Bar />
    }
  }

  class Bar extends Purview.Component<{}, {}> {
    constructor(props: {}) {
      super(props)
      barInstance = this
    }

    componentDidMount(): void {
      barMountCount++
    }

    componentWillUnmount(): void {
      barUnmountCount++
    }

    render(): JSX.Element {
      return <div />
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    let lockPromise = barInstance._lock(
      async () => new Promise(resolve => setTimeout(resolve, 25)),
    )
    void fooInstance._triggerMount()

    barMountCount = 0
    fooMountCount = 0

    await new Promise(resolve => setTimeout(resolve, 10))
    expect(barMountCount).toBe(0)
    expect(fooMountCount).toBe(0)

    await lockPromise
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(barMountCount).toBe(1)
    expect(fooMountCount).toBe(1)

    lockPromise = barInstance._lock(
      async () => new Promise(resolve => setTimeout(resolve, 50)),
    )
    conn.ws.close()

    // Wait for unmount.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(barUnmountCount).toBe(0)
    expect(fooUnmountCount).toBe(0)

    await lockPromise
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(barUnmountCount).toBe(1)
    expect(fooUnmountCount).toBe(1)
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
      return <Bar count={this.state.count} />
    }
  }

  class Bar extends Purview.Component<{ count: number }, { label: string }> {
    state = { label: "Count" }

    componentWillReceiveProps(props: { count: number }): void {
      receivedProps = props
      void this.setState({ label: "New Count" })
    }

    render(): JSX.Element {
      return (
        <p>
          {this.state.label}: {this.props.count}
        </p>
      )
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    expect(receivedProps).toBe(null)
    void instance.setState({ count: 1 })

    const message = await conn.messages.next()
    expect(message.type).toBe("update")
    expect(message.componentID).toBe(conn.rootID)

    const p = concretize(message.pNode)
    expect(p.textContent).toBe("New Count: 1")
    expect(receivedProps).toEqual({ count: 1, children: [] })

    const nextMessage = await Promise.race([
      conn.messages.next(),
      new Promise<undefined>(resolve => setTimeout(resolve, 50)),
    ])
    expect(nextMessage).toBe(undefined)
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
    expect(conn.updateMessage.newEventNames).toEqual(["change"])
    void instance.setState({ enabled: true })

    const message1 = await conn.messages.next()
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
    void instance.setState({ enabled: true })

    const message2 = await conn.messages.next()
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
    expect(conn.updateMessage.newEventNames).toEqual(["change"])
    void instance.setState({ enabled: true })

    const message1 = await conn.messages.next()
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
    void instance.setState({ enabled: true })

    const message2 = await conn.messages.next()
    expect(message2.type).toBe("update")
    expect(message2.componentID).toBe(conn.rootID)
    expect(message2.newEventNames).toEqual(["change", "keydown"])
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
      void foo.setState({})
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
      await new Promise(resolve => setTimeout(resolve, 100))
      return {}
    }

    render(): JSX.Element {
      return <div />
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    void foo.setState({ showBaz: true })
    await new Promise(resolve => setTimeout(resolve, 50))
    void bar.setState({ text: "Hi" })

    const p1 = conn.elem.querySelector("p")!
    const message1 = await conn.messages.next()
    expect(message1.type).toBe("update")
    expect(message1.componentID).toBe(p1.getAttribute("data-component-id"))

    const p2 = concretize(message1.pNode)
    expect(p2.textContent).toBe("Hi")

    const message2 = await conn.messages.next()
    expect(message2.type).toBe("update")
    expect(message2.componentID).toBe(conn.rootID)

    const p3 = concretize(message2.pNode).querySelector("p")!
    expect(p3.textContent).toBe("Hi")
  })
})

test("origin validation", async () => {
  const server = http.createServer()
  await new Promise(resolve => server.listen(resolve))

  const addr = server.address() as net.AddressInfo
  const origin = `http://localhost:${addr.port}`
  Purview.handleWebSocket(server, { origin })

  const ws = new WebSocket(`ws://localhost:${addr.port}`, {
    origin: `http://example.com`,
  })
  const error = await new Promise<Error>(resolve =>
    ws.addEventListener("error", resolve),
  )
  expect(error.message).toBe("Unexpected server response: 401")

  server.close()
  ws.close()
})

test("reconnect", async () => {
  let instance: Foo
  let mountCount = 0
  let unmountCount = 0

  class Foo extends Purview.Component<{}, { text: string }> {
    state = { text: "hi" }

    constructor(props: {}) {
      super(props)
      instance = this
    }

    componentDidMount(): void {
      mountCount++
    }

    componentWillUnmount(): void {
      unmountCount++
    }

    render(): JSX.Element {
      return <p>{this.state.text}</p>
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    expect(mountCount).toBe(1)
    expect(unmountCount).toBe(0)

    void instance.setState({ text: "hello" })
    await conn.messages.next()
    conn.ws.close()

    // Wait for state to be saved and unmount to occur.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(mountCount).toBe(1)
    expect(unmountCount).toBe(1)

    const origin = `http://localhost:${conn.port}`
    const ws = new WebSocket(`ws://localhost:${conn.port}`, { origin })
    await new Promise(resolve => ws.addEventListener("open", resolve))

    const connect: ClientMessage = {
      type: "connect",
      rootIDs: [conn.rootID],
    }
    ws.send(JSON.stringify(connect))

    await new Promise(resolve => {
      ws.addEventListener("message", messageEvent => {
        const message: ServerMessage = JSON.parse(messageEvent.data.toString())
        expect(message.type).toBe("update")
        expect(concretize(message.pNode).textContent).toBe("hello")
        resolve()
      })
    })

    expect(mountCount).toBe(2)
    expect(unmountCount).toBe(1)
    ws.close()

    // Wait for state to be saved and unmount to occur.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(mountCount).toBe(2)
    expect(unmountCount).toBe(2)
  })
})

test("reconnect new child component mount cycle", async () => {
  let showBar = false
  let mountCount = 0
  let unmountCount = 0

  class Foo extends Purview.Component<{}, {}> {
    render(): JSX.Element {
      if (showBar) {
        return <Bar />
      }
      return <p>Foo</p>
    }
  }

  class Bar extends Purview.Component<{}, {}> {
    componentDidMount(): void {
      mountCount++
    }

    componentWillUnmount(): void {
      unmountCount++
    }

    render(): JSX.Element {
      return <p>Bar</p>
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    conn.ws.close()

    // Wait for state to be saved and unmount to occur.
    await new Promise(resolve => setTimeout(resolve, 25))
    const origin = `http://localhost:${conn.port}`
    const ws = new WebSocket(`ws://localhost:${conn.port}`, { origin })
    await new Promise(resolve => ws.addEventListener("open", resolve))

    showBar = true
    const connect: ClientMessage = {
      type: "connect",
      rootIDs: [conn.rootID],
    }
    ws.send(JSON.stringify(connect))

    await new Promise(resolve => {
      ws.addEventListener("message", messageEvent => {
        const message: ServerMessage = JSON.parse(messageEvent.data.toString())
        expect(message.type).toBe("update")
        expect(concretize(message.pNode).textContent).toBe("Bar")
        resolve()
      })
    })

    expect(mountCount).toBe(1)
    expect(unmountCount).toBe(0)
    ws.close()

    // Wait for state to be saved and unmount to occur.
    await new Promise(resolve => setTimeout(resolve, 25))
    expect(mountCount).toBe(1)
    expect(unmountCount).toBe(1)
  })
})

test("reconnect early", async () => {
  class Foo extends Purview.Component<{}, {}> {
    render(): JSX.Element {
      return <p>Hi</p>
    }
  }

  await renderAndConnect(<Foo />, async conn => {
    const origin = `http://localhost:${conn.port}`
    const ws = new WebSocket(`ws://localhost:${conn.port}`, { origin })
    await new Promise(resolve => ws.addEventListener("open", resolve))

    const connect: ClientMessage = {
      type: "connect",
      rootIDs: [conn.rootID],
    }
    ws.send(JSON.stringify(connect))
    await new Promise(resolve => ws.addEventListener("close", resolve))
  })
})

test("setState() after unmount", async () => {
  let instance: Foo = null as any
  class Foo extends Purview.Component<{}, {}> {
    constructor(props: {}) {
      super(props)
      instance = this
    }

    render(): JSX.Element {
      return <p>Hi</p>
    }
  }

  await renderAndConnect(<Foo />, async () => null)
  // Wait for unmount.
  await new Promise(resolve => setTimeout(resolve, 25))

  for (let i = 0; i < MAX_SET_STATE_AFTER_UNMOUNT; i++) {
    await instance.setState({})
  }
  await expect(instance.setState({})).rejects.toThrow(
    "setState() called after unmount",
  )
})

async function renderAndConnect<T>(
  jsxElem: JSX.Element,
  callback: (
    conn: {
      ws: WebSocket
      port: number
      rootID: string
      elem: Element
      updateMessage: UpdateMessage
      messages: AsyncQueue<ServerMessage>
    },
  ) => Promise<T>,
): Promise<T> {
  const server = http.createServer(async (req, res) => {
    res.end(await Purview.render(jsxElem, req))
  })
  await new Promise(resolve => server.listen(resolve))

  const port = (server.address() as net.AddressInfo).port
  const html = await new Promise<string>(resolve => {
    http.get(`http://localhost:${port}`, res => {
      let data = ""
      res.setEncoding("utf8")
      res.on("data", chunk => (data += chunk))
      res.on("end", () => resolve(data))
    })
  })

  const id = parseHTML(html).getAttribute("data-component-id")
  if (!id) {
    throw new Error(`Expected component ID, but got: ${id}`)
  }

  const origin = `http://localhost:${port}`
  Purview.handleWebSocket(server, { origin })
  const ws = new WebSocket(`ws://localhost:${port}`, { origin })
  await new Promise(resolve => ws.addEventListener("open", resolve))

  const messages = new AsyncQueue<ServerMessage>()
  const updateMessage = await new Promise<UpdateMessage>(resolve => {
    let resolved = false
    ws.addEventListener("message", messageEvent => {
      const message: ServerMessage = JSON.parse(messageEvent.data.toString())
      switch (message.type) {
        case "update":
          if (resolved) {
            messages.push(message)
          } else {
            resolve(message)
            resolved = true
          }
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
      port,
      rootID: id,
      elem: concretize(updateMessage.pNode),
      updateMessage,
      messages,
    })
  } finally {
    server.close()
    ws.close()
  }
  return result
}
