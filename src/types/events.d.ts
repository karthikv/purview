export type PurviewEvent =
  | InputEvent<any>
  | ChangeEvent<any>
  | SubmitEvent
  | KeyEvent
export type EventCallback = (event?: PurviewEvent) => void

export interface InputEvent<T = string> {
  value: T
}

export interface ChangeEvent<T = string> extends InputEvent<T> {}

export interface SubmitEvent {
  fields: { [key: string]: any }
}

export interface KeyEvent {
  key: string
}
