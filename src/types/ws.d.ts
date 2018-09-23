interface UpdateMessage {
  type: "update"
  componentID: string
  html: string
}

type ServerMessage = UpdateMessage

interface ConnectMessage {
  type: "connect"
  rootIDs: string[]
}

interface EventMessage {
  type: "event"
  eventID: string
}

type ClientMessage = ConnectMessage | EventMessage
