import { StateTree, ChildMap, EventHandler } from "./purview";
import { PNodeRegular } from "./types/ws";
import { JSX } from "./purview";
declare type UpdateFn<S> = (state: Readonly<S>) => Partial<S>;
export interface ComponentConstructor<P, S> {
    _stateless: boolean;
    getUniqueName(): string;
    new (props: P): Component<P, S>;
}
interface Component<P, S> {
    getInitialState?(): Promise<S>;
}
export declare const MAX_SET_STATE_AFTER_UNMOUNT = 10;
declare abstract class Component<P, S> {
    protected props: Readonly<P>;
    _id: string;
    _childMap: ChildMap<Component<any, any> | StateTree>;
    _newChildMap: ChildMap<Component<any, any> | null>;
    _handleUpdate?: () => Promise<void>;
    _eventHandlers: Record<string, EventHandler | undefined>;
    _newEventHandlers: Record<string, EventHandler | undefined>;
    _pNode: PNodeRegular;
    _unmounted: boolean;
    _directlyNests: boolean;
    _isPurviewComponent: boolean;
    protected state: Readonly<S>;
    private _changesets;
    private _lockedPromise;
    private _numSetStateAfterUnmount;
    static getUniqueName(): string;
    static _stateless: boolean;
    static _statelessName: string | undefined;
    constructor(props: Readonly<P>);
    abstract render(): JSX.Element;
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentWillReceiveProps(_: P): void;
    setState(changes: Partial<S> | UpdateFn<S>): Promise<void>;
    _applyChangesetsLocked(): boolean;
    _lock<T>(callback: () => T | Promise<T>): Promise<T>;
    _initState(savedState?: S, reload?: boolean): Promise<void>;
    _triggerMount(allComponentsMap: Record<string, Component<any, any> | undefined> | null): Promise<void>;
    _mountSelfLocked(allComponentsMap: Record<string, Component<any, any> | undefined> | null): void;
    _triggerUnmount(allComponentsMap: Record<string, Component<any, any> | undefined> | null): Promise<void>;
    _setProps(props: Readonly<P>): void;
}
export default Component;
