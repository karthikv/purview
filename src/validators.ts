import * as t from "io-ts"
import {
  InputEvent,
  ChangeEvent,
  SubmitEvent,
  KeyEvent,
  ConnectMessage,
  EventMessage,
  SeenEventNamesMessage,
  ClientMessage,
  ConnectedMessage,
  UpdateMessage,
  ServerMessage,
} from "./types/ws"

// --------------------------------------------------------------------------
// N.B. If you change validators here, make sure to update src/types/ws.d.ts!
// --------------------------------------------------------------------------

export const makeInputEventValidator = <T extends t.Mixed>(type: T) =>
  t.type({ value: type })
const inputEventStringValidator = makeInputEventValidator(t.string)
type InputEventStringValidator = t.TypeOf<typeof inputEventStringValidator>
check<InputEventStringValidator, InputEvent<string>>()
check<InputEvent<string>, InputEventStringValidator>()

export const makeChangeEventValidator = makeInputEventValidator
const changeEventStringValidator = makeChangeEventValidator(t.string)
type ChangeEventStringValidator = t.TypeOf<typeof changeEventStringValidator>
check<ChangeEventStringValidator, ChangeEvent<string>>()
check<ChangeEvent<string>, ChangeEventStringValidator>()

export const submitEventValidator = t.type({ fields: t.Dictionary })
type SubmitEventValidator = t.TypeOf<typeof submitEventValidator>
check<SubmitEventValidator, SubmitEvent>()
check<SubmitEvent, SubmitEventValidator>()

export const keyEventValidator = t.type({ key: t.string })
type KeyEventValidator = t.TypeOf<typeof keyEventValidator>
check<KeyEventValidator, KeyEvent>()
check<KeyEvent, KeyEventValidator>()

const connectMessageValidator = t.type({
  type: t.literal("connect"),
  rootIDs: t.array(t.string),
})
type ConnectMessageValidator = t.TypeOf<typeof connectMessageValidator>
check<ConnectMessageValidator, ConnectMessage>()
check<ConnectMessage, ConnectMessageValidator>()

const eventMessageValidator = t.intersection([
  t.type({
    type: t.literal("event"),
    rootID: t.string,
    eventID: t.string,
  }),
  t.partial({ event: t.any }),
])
type EventMessageValidator = t.TypeOf<typeof eventMessageValidator>
check<EventMessageValidator, EventMessage>()
check<EventMessage, EventMessageValidator>()

const seenEventNamesMessageValidator = t.type({
  type: t.literal("seenEventNames"),
  seenEventNames: t.array(t.string),
})
type SeenEventNamesMessageValidator = t.TypeOf<
  typeof seenEventNamesMessageValidator
>
check<SeenEventNamesMessageValidator, SeenEventNamesMessage>()
check<SeenEventNamesMessage, SeenEventNamesMessageValidator>()

export const clientMessageValidator = t.taggedUnion("type", [
  connectMessageValidator,
  eventMessageValidator,
  seenEventNamesMessageValidator,
])
type ClientMessageValidator = t.TypeOf<typeof clientMessageValidator>
check<ClientMessageValidator, ClientMessage>()
check<ClientMessage, ClientMessageValidator>()

const connectedMessageValidator = t.type({
  type: t.literal("connected"),
  newEventNames: t.array(t.string),
})
type ConnectedMessageValidator = t.TypeOf<typeof connectedMessageValidator>
check<ConnectedMessageValidator, ConnectedMessage>()
check<ConnectedMessage, ConnectedMessageValidator>()

const updateMessageValidator = t.type({
  type: t.literal("update"),
  componentID: t.string,
  html: t.string,
  newEventNames: t.array(t.string),
})
type UpdateMessageValidator = t.TypeOf<typeof updateMessageValidator>
check<UpdateMessageValidator, UpdateMessage>()
check<UpdateMessage, UpdateMessageValidator>()

export const serverMessageValidator = t.taggedUnion("type", [
  connectedMessageValidator,
  updateMessageValidator,
])
type ServerMessageValidator = t.TypeOf<typeof serverMessageValidator>
check<ServerMessageValidator, ServerMessage>()
check<ServerMessage, ServerMessageValidator>()

function check<A, _ extends A>(): true {
  return true
}
