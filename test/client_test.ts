import { JSDOM } from "jsdom"
import * as WebSocket from "ws"

const {
  window,
  window: { document, Element },
} = new JSDOM()
Object.assign(global, { window, document, Element, WebSocket })

import * as http from "http"
import * as net from "net"
import AsyncQueue from "./async_queue"
import { connectWebSocket } from "../src/client"

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
    await new Promise(resolve => conn.wsClient.on("message", resolve))

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
    await new Promise(resolve => {
      conn.wsClient.addEventListener("message", resolve)
    })

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
