import nanoid = require("nanoid")

type UpdateFn<S> = (state: Readonly<S>) => Partial<S>

export type StatelessComponent<T> = (props: T) => JSX.Element<any>

export interface ComponentConstructor<P, S> {
  _typeID: string
  new (props: P): Component<P, S>
}

export interface ChildMap<T = Component<any, any>> {
  [key: string]: T[]
}

interface Component<P, S> {
  getInitialState?(): Promise<S>
}

abstract class Component<P, S> {
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
  public _newChildMap: ChildMap<Component<any, any> | null> = {}
  public _handleUpdate: () => Promise<void>
  public _unmounted = false

  // This is set outside of the class and is used to disambiguate stateless
  // functions from Purview components. We can't set it here because it'll
  // only really get set when a Component is instantiated.
  public _isPurviewComponent: boolean

  protected state: Readonly<S>
  private _changesets: Array<Partial<S> | UpdateFn<S>> = []
  private _lockedPromise: Promise<any> | null = null
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

  async setState(changes: Partial<S> | UpdateFn<S>): Promise<void> {
    if (this._unmounted) {
      throw new Error("setState() called after unmount")
    }

    this._changesets.push(changes)
    await new Promise(resolve => setImmediate(resolve))

    return this._lock(async () => {
      if (this._unmounted || this._changesets.length === 0) {
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
        await this._handleUpdate()
      }
    })
  }

  async _lock<T>(callback: () => T): Promise<T> {
    if (this._lockedPromise) {
      await this._lockedPromise
      return this._lock(callback)
    }

    this._lockedPromise = (async () => {
      const result = await callback()
      this._lockedPromise = null
      return result
    })()

    return this._lockedPromise
  }

  async _initState(): Promise<void> {
    if (this.getInitialState) {
      this.state = await this.getInitialState()
    }
  }

  async _triggerMount(): Promise<void> {
    return this._lock(async () => {
      const promises = Object.keys(this._childMap).map(key =>
        Promise.all(this._childMap[key].map(c => c._triggerMount())),
      )
      await Promise.all(promises)
      this.componentDidMount()
    })
  }

  async _triggerUnmount(): Promise<void> {
    return this._lock(async () => {
      const promises = Object.keys(this._childMap).map(key =>
        Promise.all(this._childMap[key].map(c => c._triggerUnmount())),
      )
      await Promise.all(promises)
      this._unmounted = true
      this.componentWillUnmount()
    })
  }

  _setProps(props: Readonly<P>): void {
    this.componentWillReceiveProps(props)
    this.props = props
  }
}

Component.prototype._isPurviewComponent = true

export default Component
