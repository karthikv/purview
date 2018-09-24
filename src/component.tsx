import nanoid = require("nanoid")

type UpdateFn<S> = (state: Readonly<S>) => Partial<S>

export interface ComponentConstructor<P, S> {
  _typeID: string
  new (props: P): Component<P, S>
}

interface ChildMap {
  [key: string]: Array<Component<any, any>>
}

export default abstract class Component<P, S> {
  /* tslint:disable variable-name */
  static _cachedTypeID: string
  static get _typeID(): string {
    if (!this._cachedTypeID) {
      this._cachedTypeID = nanoid()
    }
    return this._cachedTypeID
  }

  public _id: string
  public _childMap: ChildMap = {}
  public _newChildMap: ChildMap = {}
  public _handleUpdate: () => void
  /* tslint:enable variable-name */

  protected state: Readonly<S>

  constructor(protected props: Readonly<P>) {
    this._id = nanoid()
  }

  abstract render(): JSX.Element

  setState(changes: Partial<S> | UpdateFn<S>): void {
    if (changes instanceof Function) {
      Object.assign(this.state, changes(this.state))
    } else {
      Object.assign(this.state, changes)
    }

    if (this._handleUpdate) {
      this._handleUpdate()
    }
  }

  _setProps(props: Readonly<P>): void {
    this.props = props
  }
}
