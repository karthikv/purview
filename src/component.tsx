import { EventEmitter } from "events"
import { v4 as makeUUID } from "uuid"

type UpdateFn<S> = (state: Readonly<S>) => Partial<S>

export interface ComponentConstructor<P, S> {
  new (props: P): Component<P, S>
}

// TODO: clean up event handlers
export default abstract class Component<P, S> extends EventEmitter {
  public id: string

  /* tslint:disable variable-name */
  public _childMap: { [key: string]: Component<any, any> } = {}
  /* tslint:enable variable-name */

  protected state: Readonly<S>

  constructor(protected props: Readonly<P>) {
    super()
    this.id = makeUUID()
  }

  abstract render(): JSX.Element

  setState(changes: Partial<S> | UpdateFn<S>): void {
    if (changes instanceof Function) {
      Object.assign(this.state, changes(this.state))
    } else {
      Object.assign(this.state, changes)
    }
    this.emit("update", this)
  }
}
