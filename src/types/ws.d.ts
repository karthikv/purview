interface ConnectMessage {
  type: "connect"
  rootIDs: string[]
}

interface EventMessage {
  type: "event"
  rootID: string
  eventID: string
}

interface SeenEventNamesMessage {
  type: "seenEventNames"
  seenEventNames: string[]
}

type ClientMessage = ConnectMessage | EventMessage | SeenEventNamesMessage

interface ConnectedMessage {
  type: "connected"
  newEventNames: string[]
}

interface UpdateMessage {
  type: "update"
  componentID: string
  html: string
  newEventNames: string[]
}

type ServerMessage = ConnectedMessage | UpdateMessage
