import { VNodeData } from "snabbdom/vnode"
import { Component } from "../purview"

export type PNode = PNodeRegular | PNodeText

export interface PNodeRegular {
  sel: string
  data: VNodeData
  children: PNode[]
  component?: Component<any, any>
}

export interface PNodeText {
  text: string
}

// ---------------------------------------------------------------------
// N.B. If you change types here, make sure to update src/validators.ts!
// ---------------------------------------------------------------------

export interface InputEvent<T = string> {
  name: string
  value: T
}

export interface ChangeEvent<T = string> extends InputEvent<T> {}

export interface SubmitEvent {
  fields: { [key: string]: any }
}

export interface KeyEvent {
  name: string
  key: string
}

export type PurviewEvent =
  | InputEvent<any>
  | ChangeEvent<any>
  | SubmitEvent
  | KeyEvent
export type EventCallback = (event?: PurviewEvent) => void

export interface ConnectMessage {
  type: "connect"
  rootIDs: string[]
}

export interface EventMessage {
  type: "event"
  rootID: string
  eventID: string
  event?: PurviewEvent
}

export interface SeenEventNamesMessage {
  type: "seenEventNames"
  seenEventNames: string[]
}

export type ClientMessage =
  | ConnectMessage
  | EventMessage
  | SeenEventNamesMessage

export interface UpdateMessage {
  type: "update"
  componentID: string
  pNode: PNodeRegular
  newEventNames: string[]
}

export type ServerMessage = UpdateMessage
