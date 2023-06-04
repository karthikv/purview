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
  NextRuleIndexMessage,
} from "./types/ws"

// ------------------------------------------------------------------------
// N.B. If you change validators here, make sure to update src/types/ws.ts!
// ------------------------------------------------------------------------

export const makeInputEventValidator = <T extends t.Mixed>(type: T) =>
  t.exact(t.type({ name: t.string, value: type }))
const inputEventStringValidator = makeInputEventValidator(t.string)
type InputEventStringValidator = t.TypeOf<typeof inputEventStringValidator>
check<InputEventStringValidator, InputEvent<string>>()
check<InputEvent<string>, InputEventStringValidator>()

export const makeChangeEventValidator = makeInputEventValidator
const changeEventStringValidator = makeChangeEventValidator(t.string)
type ChangeEventStringValidator = t.TypeOf<typeof changeEventStringValidator>
check<ChangeEventStringValidator, ChangeEvent<string>>()
check<ChangeEvent<string>, ChangeEventStringValidator>()

export const submitEventValidator = t.exact(t.type({ fields: t.Dictionary }))
type SubmitEventValidator = t.TypeOf<typeof submitEventValidator>
check<SubmitEventValidator, SubmitEvent>()
check<SubmitEvent, SubmitEventValidator>()

export const keyEventValidator = t.exact(
  t.type({ name: t.string, key: t.string }),
)
type KeyEventValidator = t.TypeOf<typeof keyEventValidator>
check<KeyEventValidator, KeyEvent>()
check<KeyEvent, KeyEventValidator>()

const connectMessageValidator = t.exact(
  t.intersection([
    t.type({
      type: t.literal("connect"),
      rootIDs: t.array(t.string),
    }),
    t.partial({ cssStateID: t.string }),
  ]),
)
type ConnectMessageValidator = t.TypeOf<typeof connectMessageValidator>
check<ConnectMessageValidator, ConnectMessage>()
check<ConnectMessage, ConnectMessageValidator>()

const eventMessageValidator = t.exact(
  t.intersection([
    t.type({
      type: t.literal("event"),
      rootID: t.string,
      componentID: t.string,
      eventID: t.string,
    }),
    t.partial({ event: t.any }),
  ]),
)
type EventMessageValidator = t.TypeOf<typeof eventMessageValidator>
check<EventMessageValidator, EventMessage>()
check<EventMessage, EventMessageValidator>()

const seenEventNamesMessageValidator = t.exact(
  t.type({
    type: t.literal("seenEventNames"),
    seenEventNames: t.array(t.string),
  }),
)
type SeenEventNamesMessageValidator = t.TypeOf<
  typeof seenEventNamesMessageValidator
>
check<SeenEventNamesMessageValidator, SeenEventNamesMessage>()
check<SeenEventNamesMessage, SeenEventNamesMessageValidator>()

const nextRuleIndexMessageValidator = t.exact(
  t.type({
    type: t.literal("nextRuleIndex"),
    nextRuleIndex: t.number,
  }),
)
type NextRuleIndexMessageValidator = t.TypeOf<
  typeof nextRuleIndexMessageValidator
>

check<NextRuleIndexMessageValidator, NextRuleIndexMessage>()
check<NextRuleIndexMessage, NextRuleIndexMessageValidator>()

export const clientMessageValidator = t.union([
  connectMessageValidator,
  eventMessageValidator,
  seenEventNamesMessageValidator,
  nextRuleIndexMessageValidator,
])
type ClientMessageValidator = t.TypeOf<typeof clientMessageValidator>
check<ClientMessageValidator, ClientMessage>()
check<ClientMessage, ClientMessageValidator>()

function check<A, _ extends A>(): true {
  return true
}
