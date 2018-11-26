import { JSDOM } from "jsdom"
import * as WebSocket from "ws"

const {
  window,
  window: { document, HTMLElement },
} = new JSDOM()
Object.assign(global, { window, document, HTMLElement, WebSocket })

import * as http from "http"
import * as net from "net"
import AsyncQueue from "./async_queue"
import { connectWebSocket } from "../src/client"
import {
  SeenEventNamesMessage,
  EventMessage,
  ConnectMessage,
  UpdateMessage,
  ClientMessage,
  ConnectedMessage,
} from "../src/types/ws"

test("connectWebSocket", async () => {
  document.body.innerHTML = `
    <p data-root="true" data-component-id="foo">Paragraph</p>
    <div data-component-id="bar" />
    <section><a data-root="true" data-component-id="baz"></a></section>
  `

  const { wsClient, reload } = await connect(async conn => {
    const message = (await conn.messages.next()) as ConnectMessage
    expect(message.type).toBe("connect")
    expect(message.rootIDs).toEqual(["foo", "baz"])
    return conn
  })

  await new Promise(resolve => wsClient.addEventListener("close", resolve))
  expect(reload).toBeCalled()
})

test("connectWebSocket update", async () => {
  document.body.innerHTML = `
    <p data-root="true" data-component-id="foo">
      This is a paragraph.
    </p>
  `

  await connect(async conn => {
    const updateMessage: UpdateMessage = {
      type: "update",
      componentID: "foo",
      html: `
          <div data-root="true" data-component-id="foo">
            <a href="#">Link</a>
          </div>
        `,
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
  document.body.innerHTML = `
    <p data-root="true" data-component-id="foo" data-click-capture="bar">
      This is <a data-click="baz">a link</a>.
    </p>
  `

  await connect(async conn => {
    const message1 = (await conn.messages.next()) as ConnectMessage
    expect(message1.type).toBe("connect")
    expect(message1.rootIDs).toEqual(["foo"])

    const connectedMessage: ConnectedMessage = {
      type: "connected",
      newEventNames: ["click"],
    }
    conn.ws.send(JSON.stringify(connectedMessage))

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
  document.body.innerHTML = `
    <p data-root="true" data-component-id="foo">
      This is a paragraph.
    </p>
  `

  await connect(async conn => {
    const message1 = (await conn.messages.next()) as ConnectMessage
    expect(message1.type).toBe("connect")
    expect(message1.rootIDs).toEqual(["foo"])

    const updateMessage: UpdateMessage = {
      type: "update",
      componentID: "foo",
      html: `
          <p data-root="true" data-component-id="foo" data-click-capture="bar">
            <a href="#" data-click="baz">Link</a>
          </p
        `,
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
  document.body.innerHTML = `
    <div data-root="true" data-component-id="foo">
      <input data-input="bar" />
      <input type="checkbox" data-input="baz" />
      <select multiple data-change="other">
        <option>Foo</option>
        <option>Bar</option>
        <option>Baz</option>
      </select>
    </div>
  `

  await connect(async conn => {
    const connectedMessage: ConnectedMessage = {
      type: "connected",
      newEventNames: ["input", "change"],
    }
    conn.ws.send(JSON.stringify(connectedMessage))

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
    expect(message1.event).toEqual({ value: "value" })

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
    expect(message2.event).toEqual({ value: true })

    const event3 = new window.Event("change", { bubbles: true })
    const select = document.body.querySelector("select") as HTMLSelectElement
    select.options[1].selected = true
    select.options[2].selected = true
    select.dispatchEvent(event3)

    const message3 = (await conn.messages.next()) as EventMessage
    expect(message3.type).toBe("event")
    expect(message3.rootID).toBe("foo")
    expect(message3.eventID).toBe("other")
    expect(message3.event).toEqual({ value: ["Bar", "Baz"] })
  })
})

test("key event", async () => {
  document.body.innerHTML = `
    <div data-root="true" data-component-id="foo">
      <input data-keydown="bar" />
    </div>
  `

  await connect(async conn => {
    const connectedMessage: ConnectedMessage = {
      type: "connected",
      newEventNames: ["keydown"],
    }
    conn.ws.send(JSON.stringify(connectedMessage))

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
    expect(message.event).toEqual({ key })
  })
})

async function connect<T>(
  callback: (
    conn: {
      ws: WebSocket
      wsClient: WebSocket
      messages: AsyncQueue<ClientMessage>
      reload: jest.Mock<{}>
    },
  ) => Promise<T>,
): Promise<T> {
  const server = http.createServer()
  await new Promise(resolve => server.listen(resolve))

  const addr = server.address() as net.AddressInfo
  const wsServer = new WebSocket.Server({ server })

  const reload = jest.fn()
  const location: Location = {
    protocol: "http:",
    host: `127.0.0.1:${addr.port}`,
    pathname: "",
    search: "",
    reload,
  } as any

  const wsClient: WebSocket = connectWebSocket(location) as any
  const messages = new AsyncQueue<ClientMessage>()

  const wsConn = await new Promise((resolve: (ws: WebSocket) => void) => {
    wsServer.on("connection", ws => {
      ws.on("message", data => messages.push(JSON.parse(data.toString())))
      resolve(ws)
    })
  })

  let result
  try {
    result = await callback({ ws: wsConn, wsClient, messages, reload })
  } finally {
    server.close()
    wsConn.close()
  }
  return result
}
