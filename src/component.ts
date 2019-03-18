import nanoid = require("nanoid")
import { StateTree } from "./purview"
import { PNodeRegular } from "./types/ws"

type UpdateFn<S> = (state: Readonly<S>) => Partial<S>

export interface ComponentConstructor<P, S> {
  _typeID: string
  new (props: P): Component<P, S>
}

export type ChildMap<T> = Record<string, T[]>

interface Component<P, S> {
  getInitialState?(): Promise<S>
}

export const MAX_SET_STATE_AFTER_UNMOUNT = 10

abstract class Component<P, S> {
  /* tslint:disable variable-name */
  public _id: string
  public _childMap: ChildMap<Component<any, any> | StateTree> = {}
  public _newChildMap: ChildMap<Component<any, any> | null> = {}
  public _handleUpdate: () => Promise<void>
  public _pNode: PNodeRegular
  public _unmounted = false

  // This is set outside of the class and is used to disambiguate stateless
  // functions from Purview components. We can't set it here because it'll
  // only really get set when a Component is instantiated.
  public _isPurviewComponent: boolean

  protected state: Readonly<S> = {} as any
  private _changesets: Array<Partial<S> | UpdateFn<S>> = []
  private _lockedPromise: Promise<any> | null = null
  private _numSetStateAfterUnmount = 0
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
      this._numSetStateAfterUnmount++
      if (this._numSetStateAfterUnmount > MAX_SET_STATE_AFTER_UNMOUNT) {
        throw new Error(
          `setState() called after unmount more than ${MAX_SET_STATE_AFTER_UNMOUNT} times`,
        )
      }
      return
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

  async _initState(savedState?: S): Promise<void> {
    let initialState = this.state
    if (this.getInitialState) {
      initialState = await this.getInitialState()
    }
    this.state = Object.assign(initialState, savedState)
  }

  async _triggerMount(): Promise<void> {
    return this._lock(async () => {
      const promises = Object.keys(this._childMap).map(key => {
        const childPromises = this._childMap[key].map(child => {
          if (child instanceof Component) {
            return child._triggerMount()
          }
          return
        })
        return Promise.all(childPromises)
      })
      await Promise.all(promises)
      this.componentDidMount()
    })
  }

  async _triggerUnmount(): Promise<void> {
    return this._lock(async () => {
      const promises = Object.keys(this._childMap).map(key => {
        const childPromises = this._childMap[key].map(child => {
          if (child instanceof Component) {
            return child._triggerUnmount()
          }
          return
        })
        return Promise.all(childPromises)
      })
      await Promise.all(promises)
      this.componentWillUnmount()
      this._unmounted = true
    })
  }

  _setProps(props: Readonly<P>): void {
    this.componentWillReceiveProps(props)
    this.props = props
  }
}

Component.prototype._isPurviewComponent = true

export default Component
