import { nanoid } from "nanoid"
import { StateTree, ChildMap, EventHandler } from "./purview"
import { PNodeRegular } from "./types/ws"
import { JSX } from "./purview"
type UpdateFn<S> = (state: Readonly<S>) => Partial<S>

export interface ComponentConstructor<P, S> {
  _stateless: boolean
  getUniqueName(): string
  new (props: P): Component<P, S>
}

interface Component<P, S> {
  getInitialState?(): Promise<S>
}

export const MAX_SET_STATE_AFTER_UNMOUNT = 10

// Used to ensure components have globally unique names. If classes are garbage
// collected, we don't want to hold strong references to them and leak memory,
// so we use a WeakSet. Note that we will still leak a small amount of memory
// for component names, but we anticipate this to be negligible unless millions
// of classes are dynamically generated. If we switch to supporting ES2021+, we
// could use WeakRef and FinalizationRegistry to accomplish this without leaking
// names. See https://github.com/tc39/proposal-weakrefs#weak-caches
const SEEN_COMPONENTS = new WeakSet<ComponentConstructor<unknown, unknown>>()
const SEEN_COMPONENT_NAMES = new Set<string>()

abstract class Component<P, S> {
  /* tslint:disable variable-name */
  public _id: string
  public _childMap: ChildMap<Component<any, any> | StateTree> = {}
  public _newChildMap: ChildMap<Component<any, any> | null> = {}
  public _handleUpdate?: () => Promise<void>
  public _eventHandlers: Record<string, EventHandler | undefined> = {}
  public _newEventHandlers: Record<string, EventHandler | undefined> = {}
  public _pNode: PNodeRegular
  public _unmounted = false
  public _directlyNests = false

  // This is set outside of the class and is used to disambiguate stateless
  // functions from Purview components. We can't set it here because it'll
  // only really get set when a Component is instantiated.
  public _isPurviewComponent: boolean

  protected state: Readonly<S> = {} as any
  private _changesets: Array<Partial<S> | UpdateFn<S>> = []
  private _lockedPromise: Promise<any> | null = null
  private _numSetStateAfterUnmount = 0
  /* tslint:enable variable-name */

  // Returns a unique name for this component (i.e. a name not shared by any
  // other components), defaulting to the class name. Because the unique name
  // is used for reloading the state of the component for the initial web
  // socket connection, any disconnects, and code restarts, it should be
  // deterministic--i.e. even if the app is restarted or a different process
  // handles a request, the unique name for a class should remain the same. If
  // the name changes, Purview won't be able to reload the state correctly and
  // the page may not work as expected until it is refreshed.
  static getUniqueName(): string {
    // We don't need to reload state if this component is stateless, and hence
    // we can use a random name that can change across restarts/processes.
    if (this._stateless) {
      this._statelessName = this._statelessName ?? nanoid()
      return this._statelessName
    }
    return this.name
  }
  static _stateless = false
  static _statelessName: string | undefined

  constructor(protected props: Readonly<P>) {
    this._id = nanoid()
    const componentConstructor = this.constructor as ComponentConstructor<
      unknown,
      unknown
    >
    if (componentConstructor._stateless) {
      return
    }

    const name = componentConstructor.getUniqueName()
    if (!name) {
      throw new Error("Please give each Purview Component class a name.")
    }

    if (!SEEN_COMPONENTS.has(componentConstructor)) {
      if (SEEN_COMPONENT_NAMES.has(name)) {
        throw new Error(
          `Each Purview Component class must have a unique name. This name isn't unique: ${name}. You may define a static getUniqueName() function to specify a name different from the class name if you'd like.`,
        )
      }

      SEEN_COMPONENTS.add(componentConstructor)
      SEEN_COMPONENT_NAMES.add(name)
    }
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
      if (this._applyChangesetsLocked() && this._handleUpdate) {
        await this._handleUpdate()
      }
    })
  }

  _applyChangesetsLocked(): boolean {
    if (this._unmounted || this._changesets.length === 0) {
      return false
    }

    this._changesets.forEach(cs => {
      if (cs instanceof Function) {
        Object.assign(this.state, cs(this.state))
      } else {
        Object.assign(this.state, cs)
      }
    })
    this._changesets = []
    return true
  }

  async _lock<T>(callback: () => T | Promise<T>): Promise<T> {
    if (this._lockedPromise) {
      await this._lockedPromise
      return this._lock(callback)
    }

    this._lockedPromise = (async () => {
      let result
      try {
        result = await callback()
      } finally {
        this._lockedPromise = null
      }
      return result
    })()

    return this._lockedPromise
  }

  async _initState(savedState?: S, reload: boolean = true): Promise<void> {
    let initialState = this.state
    if (reload && this.getInitialState) {
      initialState = await this.getInitialState()
    }
    this.state = Object.assign(initialState, savedState)
  }

  async _triggerMount(
    allComponentsMap: Record<string, Component<any, any> | undefined> | null,
  ): Promise<void> {
    return this._lock(async () => {
      const promises = Object.keys(this._childMap).map(key => {
        const childPromises = this._childMap[key]!.map(child => {
          if (child instanceof Component) {
            return child._triggerMount(allComponentsMap)
          }
          return
        })
        return Promise.all(childPromises)
      })
      await Promise.all(promises)

      this._mountSelfLocked(allComponentsMap)
    })
  }

  _mountSelfLocked(
    allComponentsMap: Record<string, Component<any, any> | undefined> | null,
  ): void {
    this.componentDidMount()
    if (allComponentsMap) {
      allComponentsMap[this._id] = this
    }
  }

  async _triggerUnmount(
    allComponentsMap: Record<string, Component<any, any> | undefined> | null,
  ): Promise<void> {
    return this._lock(async () => {
      const promises = Object.keys(this._childMap).map(key => {
        const childPromises = this._childMap[key]!.map(child => {
          if (child instanceof Component) {
            return child._triggerUnmount(allComponentsMap)
          }
          return
        })
        return Promise.all(childPromises)
      })
      await Promise.all(promises)

      this.componentWillUnmount()
      if (allComponentsMap) {
        delete allComponentsMap[this._id]
      }
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
