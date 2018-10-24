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

  componentDidMount(): void {
    // May be implemented by subclasses.
  }

  componentWillUnmount(): void {
    // May be implemented by subclasses.
  }

  componentWillReceiveProps(_: P): void {
    // May be implemented by subclasses.
  }

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

  _triggerMount(): void {
    this.componentDidMount()
    Object.keys(this._childMap).forEach(key => {
      this._childMap[key].forEach(c => c._triggerMount())
    })
  }

  _triggerUnmount(): void {
    this.componentWillUnmount()
    Object.keys(this._childMap).forEach(key => {
      this._childMap[key].forEach(c => c._triggerUnmount())
    })
  }

  _setProps(props: Readonly<P>): void {
    this.componentWillReceiveProps(props)
    this.props = props
  }
}
