interface ConnectMessage {
  type: "connect"
  rootIDs: string[]
}

interface EventMessage {
  type: "event"
  rootID: string
  eventID: string
}

type ClientMessage = ConnectMessage | EventMessage

interface ConnectedMessage {
  type: "connected"
}

interface UpdateMessage {
  type: "update"
  componentID: string
  html: string
}

type ServerMessage = ConnectedMessage | UpdateMessage
