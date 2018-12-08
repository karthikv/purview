import nanoid = require("nanoid")

type UpdateFn<S> = (state: Readonly<S>) => Partial<S>

export type StatelessComponent<T> = (props: T) => JSX.Element<any>

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

  // This is set outside of the class and is used to disambiguate stateless
  // functions from Purview components. We can't set it here because it'll
  // only really get set when a Component is instantiated.
  public _isPurviewComponent: boolean

  protected state: Readonly<S>
  private _changesets: Array<Partial<S> | UpdateFn<S>> = []
  /* tslint:enable variable-name */

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

  setState(changes: Partial<S> | UpdateFn<S>): Promise<void> {
    this._changesets.push(changes)

    return new Promise(resolve => {
      // Make all setState() calls asynchronous. This simplifies our mental
      // model; if a component event is triggered, we don't have to think about
      // setState() calls re-rendering the component in the middle of the event.
      // In the future, this may help us batch updates in more intelligent ways.
      process.nextTick(() => {
        if (this._changesets.length === 0) {
          return
        }

        this._changesets.forEach(cs => {
          if (cs instanceof Function) {
            Object.assign(this.state, cs(this.state))
          } else {
            Object.assign(this.state, cs)
          }
        })
        this._changesets = []

        if (this._handleUpdate) {
          this._handleUpdate()
        }
        resolve()
      })
    })
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

Component.prototype._isPurviewComponent = true
