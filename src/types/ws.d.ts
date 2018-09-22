interface UpdateMessage {
  type: "update"
  purviewID: string
  html: string
}

type ServerMessage = UpdateMessage

interface ConnectMessage {
  type: "connect"
  purviewIDs: string[]
}

interface EventMessage {
  type: "event"
  purviewID: string
  eventID: string
}

type ClientMessage = ConnectMessage | EventMessage
