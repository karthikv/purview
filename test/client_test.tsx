import { JSDOM } from "jsdom"
import * as WebSocket from "ws"

const {
  window,
  window: { document, HTMLElement },
} = new JSDOM()
Object.assign(global, { window, document, HTMLElement, WebSocket })

import * as http from "http"
import * as net from "net"
import Purview from "../src/purview"
import AsyncQueue from "./async_queue"
import { connectWebSocket } from "../src/client"
import {
  SeenEventNamesMessage,
  EventMessage,
  ConnectMessage,
  UpdateMessage,
  ClientMessage,
  PNodeRegular,
} from "../src/types/ws"
import { virtualize, concretize } from "../src/helpers"

test("connectWebSocket", async () => {
  document.body.innerHTML = `
    <p data-root="true" data-component-id="foo">Paragraph</p>
    <div data-component-id="bar" />
    <section><a data-root="true" data-component-id="baz"></a></section>
  `

  await connect(async conn => {
    const message = (await conn.messages.next()) as ConnectMessage
    expect(message.type).toBe("connect")
    expect(message.rootIDs).toEqual(["foo", "baz"])
    return conn
  })
})

test("connectWebSocket update", async () => {
  populate(
    <p data-root="true" data-component-id="foo">
      This is a paragraph.
    </p>,
  )

  await connect(async conn => {
    const updateMessage: UpdateMessage = {
      type: "update",
      componentID: "foo",
      pNode: virtualize(
        <div data-root="true" data-component-id="foo">
          <a href="#">Link</a>
        </div>,
      ),
      newEventNames: [],
    }

    conn.ws.send(JSON.stringify(updateMessage))
    await new Promise(resolve => {
      conn.wsClient.addEventListener("message", resolve)
    })

    const div = document.querySelector('[data-component-id="foo"]') as Element
    expect(div.nodeName).toBe("DIV")
    expect(div.getAttribute("data-root")).toBe("true")

    const a = div.children[0] as Element
    expect(a.nodeName).toBe("A")
    expect(a.getAttribute("href")).toBe("#")
    expect(a.textContent).toBe("Link")
  })
})

test("events", async () => {
  const pNode = populate(
    <p data-root="true" data-component-id="foo" data-click-capture="bar">
      This is <a data-click="baz">a link</a>.
    </p>,
  )

  await connect(async conn => {
    const message1 = (await conn.messages.next()) as ConnectMessage
    expect(message1.type).toBe("connect")
    expect(message1.rootIDs).toEqual(["foo"])

    const updateMessage: UpdateMessage = {
      type: "update",
      componentID: "foo",
      pNode,
      newEventNames: ["click"],
    }
    conn.ws.send(JSON.stringify(updateMessage))

    const message2 = (await conn.messages.next()) as SeenEventNamesMessage
    expect(message2.type).toBe("seenEventNames")
    expect(message2.seenEventNames).toEqual(["click"])

    const event = new window.MouseEvent("click", { bubbles: true })
    const a = document.body.querySelector("a") as Element
    a.dispatchEvent(event)

    // Capture event should be triggered first.
    const message3 = (await conn.messages.next()) as EventMessage
    expect(message3.type).toBe("event")
    expect(message3.rootID).toBe("foo")
    expect(message3.eventID).toBe("bar")

    const message4 = (await conn.messages.next()) as EventMessage
    expect(message4.type).toBe("event")
    expect(message4.rootID).toBe("foo")
    expect(message4.eventID).toBe("baz")
  })
})

test("events after update", async () => {
  populate(
    <p data-root="true" data-component-id="foo">
      This is a paragraph.
    </p>,
  )

  await connect(async conn => {
    const message1 = (await conn.messages.next()) as ConnectMessage
    expect(message1.type).toBe("connect")
    expect(message1.rootIDs).toEqual(["foo"])

    const updateMessage: UpdateMessage = {
      type: "update",
      componentID: "foo",
      pNode: virtualize(
        <p data-root="true" data-component-id="foo" data-click-capture="bar">
          <a href="#" data-click="baz">
            Link
          </a>
        </p>,
      ),
      newEventNames: ["click"],
    }
    conn.ws.send(JSON.stringify(updateMessage))

    const message2 = (await conn.messages.next()) as SeenEventNamesMessage
    expect(message2.type).toBe("seenEventNames")
    expect(message2.seenEventNames).toEqual(["click"])

    const event = new window.MouseEvent("click", { bubbles: true })
    const a = document.body.querySelector("a") as Element
    a.dispatchEvent(event)

    // Capture event should be triggered first.
    const message3 = (await conn.messages.next()) as EventMessage
    expect(message3.type).toBe("event")
    expect(message3.rootID).toBe("foo")
    expect(message3.eventID).toBe("bar")

    const message4 = (await conn.messages.next()) as EventMessage
    expect(message4.type).toBe("event")
    expect(message4.rootID).toBe("foo")
    expect(message4.eventID).toBe("baz")
  })
})

test("input/change event", async () => {
  const pNode = populate(
    <div data-root="true" data-component-id="foo">
      <input type="text" name="text-input" data-input="bar" />
      <input type="checkbox" data-input="baz" />
      <select name="multi-select" multiple data-change="other">
        <option>Foo</option>
        <option>Bar</option>
        <option>Baz</option>
      </select>
    </div>,
  )

  await connect(async conn => {
    const updateMessage: UpdateMessage = {
      type: "update",
      componentID: "foo",
      pNode,
      newEventNames: ["input", "change"],
    }
    conn.ws.send(JSON.stringify(updateMessage))

    // Ignore connect and seenEventNames messages.
    await conn.messages.next()
    await conn.messages.next()

    const event1 = new window.Event("input", { bubbles: true })
    const input = document.body.querySelector("input") as HTMLInputElement
    input.value = "value"
    input.dispatchEvent(event1)

    // Capture event should be triggered first.
    const message1 = (await conn.messages.next()) as EventMessage
    expect(message1.type).toBe("event")
    expect(message1.rootID).toBe("foo")
    expect(message1.eventID).toBe("bar")
    expect(message1.event).toEqual({ name: "text-input", value: "value" })

    const event2 = new window.Event("input", { bubbles: true })
    const checkbox = document.body.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement
    checkbox.checked = true
    checkbox.dispatchEvent(event2)

    // Capture event should be triggered first.
    const message2 = (await conn.messages.next()) as EventMessage
    expect(message2.type).toBe("event")
    expect(message2.rootID).toBe("foo")
    expect(message2.eventID).toBe("baz")
    expect(message2.event).toEqual({ name: "", value: true })

    const event3 = new window.Event("change", { bubbles: true })
    const select = document.body.querySelector("select") as HTMLSelectElement
    select.options[1].selected = true
    select.options[2].selected = true
    select.dispatchEvent(event3)

    const message3 = (await conn.messages.next()) as EventMessage
    expect(message3.type).toBe("event")
    expect(message3.rootID).toBe("foo")
    expect(message3.eventID).toBe("other")
    expect(message3.event).toEqual({
      name: "multi-select",
      value: ["Bar", "Baz"],
    })
  })
})

test("key event", async () => {
  const pNode = populate(
    <div data-root="true" data-component-id="foo">
      <input type="text" name="text-input" data-keydown="bar" />
    </div>,
  )

  await connect(async conn => {
    const updateMessage: UpdateMessage = {
      type: "update",
      componentID: "foo",
      pNode,
      newEventNames: ["keydown"],
    }
    conn.ws.send(JSON.stringify(updateMessage))

    // Ignore connect and seenEventNames messages.
    await conn.messages.next()
    await conn.messages.next()

    const key = "b"
    const event = new window.KeyboardEvent("keydown", { bubbles: true, key })
    const input = document.body.querySelector("input") as HTMLInputElement
    input.dispatchEvent(event)

    // Capture event should be triggered first.
    const message = (await conn.messages.next()) as EventMessage
    expect(message.type).toBe("event")
    expect(message.rootID).toBe("foo")
    expect(message.eventID).toBe("bar")
    expect(message.event).toEqual({ name: "text-input", key })
  })
})

test("submit event", async () => {
  const pNode = populate(
    <form data-root="true" data-component-id="foo" data-submit="bar">
      <input name="input" value="input-value" />
      <input name="input-disabled" disabled />

      <input type="checkbox" name="checkbox" />
      <input type="checkbox" />

      <input type="radio" name="radio" value="radio-value1" />
      <input type="radio" name="radio" value="radio-value2" checked />
      <input type="radio" name="radio" value="radio-value3" />

      <input type="number" name="number" value="17" />
      <button name="button" value="button-value" />

      <select name="select">
        <option>select-value1</option>
        <option value="select-value2" selected>
          sv2
        </option>
      </select>

      <select name="select-multiple" multiple>
        <option selected>select-value1</option>
        <option selected>select-value2</option>
        <option>select-value3</option>
      </select>

      <textarea name="textarea">textarea-value</textarea>
    </form>,
  )

  await connect(async conn => {
    const updateMessage: UpdateMessage = {
      type: "update",
      componentID: "foo",
      pNode,
      newEventNames: ["submit"],
    }
    conn.ws.send(JSON.stringify(updateMessage))

    // Ignore connect and seenEventNames messages.
    await conn.messages.next()
    await conn.messages.next()

    const event = new window.Event("submit", { bubbles: true })
    const preventDefault = jest.fn()
    event.preventDefault = preventDefault

    const form = document.body.querySelector("form") as HTMLFormElement
    form.dispatchEvent(event)
    expect(preventDefault).toBeCalled()

    // Capture event should be triggered first.
    const message = (await conn.messages.next()) as EventMessage
    expect(message.type).toBe("event")
    expect(message.rootID).toBe("foo")
    expect(message.eventID).toBe("bar")
    expect(message.event).toEqual({
      fields: {
        input: "input-value",
        checkbox: false,
        radio: "radio-value2",
        number: 17,
        button: "button-value",
        select: "select-value2",
        "select-multiple": ["select-value1", "select-value2"],
        textarea: "textarea-value",
      },
    })
  })
})

function populate(jsx: JSX.Element): PNodeRegular {
  const pNode = virtualize(jsx)
  const elem = concretize(pNode, document)
  document.body.innerHTML = ""
  document.body.appendChild(elem)
  return pNode
}

async function connect<T>(
  callback: (
    conn: {
      ws: WebSocket
      wsClient: WebSocket
      messages: AsyncQueue<ClientMessage>
    },
  ) => Promise<T>,
): Promise<T> {
  const server = http.createServer()
  await new Promise(resolve => server.listen(resolve))

  const addr = server.address() as net.AddressInfo
  const wsServer = new WebSocket.Server({ server })

  const messages = new AsyncQueue<ClientMessage>()
  const wsConnPromise = new Promise((resolve: (ws: WebSocket) => void) => {
    wsServer.on("connection", ws => {
      ws.on("message", data => messages.push(JSON.parse(data.toString())))
      resolve(ws)
    })
  })

  const location: Location = {
    protocol: "http:",
    host: `localhost:${addr.port}`,
    pathname: "",
    search: "",
  } as any

  const wsClient: WebSocket = connectWebSocket(location) as any
  const wsConn = await wsConnPromise

  let result
  try {
    result = await callback({ ws: wsConn, wsClient, messages })
  } finally {
    server.close()
    wsConn.close()
  }
  return result
}
