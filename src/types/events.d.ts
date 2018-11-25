/* tslint:disable no-namespace */
export interface InputEvent {
  value: string
  multipleValues: string[]
}

export interface SubmitEvent {
  fields: { [key: string]: string }
  multipleFields: { [key: string]: string[] }
}

export interface KeyEvent {
  key: string
}
