export type PurviewEvent = InputEvent | ChangeEvent | SubmitEvent | KeyEvent
export type EventCallback = (event?: PurviewEvent) => void

/* tslint:disable no-namespace */
export interface InputEvent {
  value: string
}

export interface ChangeEvent extends InputEvent {
  multipleValues?: string[]
}

export interface SubmitEvent {
  fields: { [key: string]: string }
  multipleFields?: { [key: string]: string[] }
}

export interface KeyEvent {
  key: string
}
