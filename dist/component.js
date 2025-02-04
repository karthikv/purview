"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_SET_STATE_AFTER_UNMOUNT = void 0;
const nanoid_1 = require("nanoid");
exports.MAX_SET_STATE_AFTER_UNMOUNT = 10;
// Used to ensure components have globally unique names. If classes are garbage
// collected, we don't want to hold strong references to them and leak memory,
// so we use a WeakSet. Note that we will still leak a small amount of memory
// for component names, but we anticipate this to be negligible unless millions
// of classes are dynamically generated. If we switch to supporting ES2021+, we
// could use WeakRef and FinalizationRegistry to accomplish this without leaking
// names. See https://github.com/tc39/proposal-weakrefs#weak-caches
const SEEN_COMPONENTS = new WeakSet();
const SEEN_COMPONENT_NAMES = new Set();
class Component {
    constructor(props) {
        this.props = props;
        this._childMap = {};
        this._newChildMap = {};
        this._eventHandlers = {};
        this._newEventHandlers = {};
        this._unmounted = false;
        this._directlyNests = false;
        this.state = {};
        this._changesets = [];
        this._lockedPromise = null;
        this._numSetStateAfterUnmount = 0;
        this._id = nanoid_1.nanoid();
        const componentConstructor = this.constructor;
        if (componentConstructor._stateless) {
            return;
        }
        const name = componentConstructor.getUniqueName();
        if (!name) {
            throw new Error("Please give each Purview Component class a name.");
        }
        if (!SEEN_COMPONENTS.has(componentConstructor)) {
            if (SEEN_COMPONENT_NAMES.has(name)) {
                throw new Error(`Each Purview Component class must have a unique name. This name isn't unique: ${name}. You may define a static getUniqueName() function to specify a name different from the class name if you'd like.`);
            }
            SEEN_COMPONENTS.add(componentConstructor);
            SEEN_COMPONENT_NAMES.add(name);
        }
    }
    /* tslint:enable variable-name */
    // Returns a unique name for this component (i.e. a name not shared by any
    // other components), defaulting to the class name. Because the unique name
    // is used for reloading the state of the component for the initial web
    // socket connection, any disconnects, and code restarts, it should be
    // deterministic--i.e. even if the app is restarted or a different process
    // handles a request, the unique name for a class should remain the same. If
    // the name changes, Purview won't be able to reload the state correctly and
    // the page may not work as expected until it is refreshed.
    static getUniqueName() {
        var _a;
        // We don't need to reload state if this component is stateless, and hence
        // we can use a random name that can change across restarts/processes.
        if (this._stateless) {
            this._statelessName = (_a = this._statelessName) !== null && _a !== void 0 ? _a : nanoid_1.nanoid();
            return this._statelessName;
        }
        return this.name;
    }
    componentDidMount() {
        // May be implemented by subclasses.
    }
    componentWillUnmount() {
        // May be implemented by subclasses.
    }
    componentWillReceiveProps(_) {
        // May be implemented by subclasses.
    }
    async setState(changes) {
        if (this._unmounted) {
            this._numSetStateAfterUnmount++;
            if (this._numSetStateAfterUnmount > exports.MAX_SET_STATE_AFTER_UNMOUNT) {
                throw new Error(`setState() called after unmount more than ${exports.MAX_SET_STATE_AFTER_UNMOUNT} times`);
            }
            return;
        }
        this._changesets.push(changes);
        await new Promise(resolve => setImmediate(resolve));
        return this._lock(async () => {
            if (this._applyChangesetsLocked() && this._handleUpdate) {
                await this._handleUpdate();
            }
        });
    }
    _applyChangesetsLocked() {
        if (this._unmounted || this._changesets.length === 0) {
            return false;
        }
        this._changesets.forEach(cs => {
            if (cs instanceof Function) {
                Object.assign(this.state, cs(this.state));
            }
            else {
                Object.assign(this.state, cs);
            }
        });
        this._changesets = [];
        return true;
    }
    async _lock(callback) {
        if (this._lockedPromise) {
            await this._lockedPromise;
            return this._lock(callback);
        }
        this._lockedPromise = (async () => {
            let result;
            try {
                result = await callback();
            }
            finally {
                this._lockedPromise = null;
            }
            return result;
        })();
        return this._lockedPromise;
    }
    async _initState(savedState, reload = true) {
        let initialState = this.state;
        if (reload && this.getInitialState) {
            initialState = await this.getInitialState();
        }
        this.state = Object.assign(initialState, savedState);
    }
    async _triggerMount(allComponentsMap) {
        return this._lock(async () => {
            const promises = Object.keys(this._childMap).map(key => {
                const childPromises = this._childMap[key].map(child => {
                    if (child instanceof Component) {
                        return child._triggerMount(allComponentsMap);
                    }
                    return;
                });
                return Promise.all(childPromises);
            });
            await Promise.all(promises);
            this._mountSelfLocked(allComponentsMap);
        });
    }
    _mountSelfLocked(allComponentsMap) {
        this.componentDidMount();
        if (allComponentsMap) {
            allComponentsMap[this._id] = this;
        }
    }
    async _triggerUnmount(allComponentsMap) {
        return this._lock(async () => {
            const promises = Object.keys(this._childMap).flatMap(key => {
                return this._childMap[key].map(async (child) => {
                    if (child instanceof Component) {
                        return child._triggerUnmount(allComponentsMap);
                    }
                });
            });
            try {
                await Promise.all(promises);
            }
            catch (error) {
                // If a child errors while unmounting, still wait for all children to be
                // processed before calling the parent's componentWillUnmount.
                await Promise.allSettled(promises);
                if (process.env.NODE_ENV !== "test") {
                    // Don't suppress the error, but ensure the finally block unmounts and
                    // cleans up appropriately.
                    throw error;
                }
            }
            finally {
                // The user-defined componentWillUnmount() may error, but we still need
                // to clean up.
                try {
                    this.componentWillUnmount();
                }
                finally {
                    if (allComponentsMap) {
                        delete allComponentsMap[this._id];
                    }
                    this._unmounted = true;
                }
            }
        });
    }
    _setProps(props) {
        this.componentWillReceiveProps(props);
        this.props = props;
    }
}
Component._stateless = false;
Component.prototype._isPurviewComponent = true;
exports.default = Component;
//# sourceMappingURL=component.js.map