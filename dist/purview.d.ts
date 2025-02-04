/// <reference types="node" />
import * as http from "http";
import * as WebSocket from "ws";
import * as t from "io-ts";
import Component, { ComponentConstructor } from "./component";
import { NestedArray } from "./helpers";
import { EventCallback } from "./types/ws";
import { JSX } from "./types/jsx";
export interface RenderOptions {
    onError?: ErrorHandler;
}
export interface WebSocketOptions {
    origin: string | null;
}
declare type WebSocketState = WebSocketStateHasCSS | WebSocketStateNoCSS;
interface WebSocketStateHasCSS extends BaseWebSocketState {
    hasCSS: true;
    cssState: CSSState;
}
interface WebSocketStateNoCSS extends BaseWebSocketState {
    hasCSS: false;
    cssState?: undefined;
}
interface BaseWebSocketState {
    ws: WebSocket;
    roots: ConnectedRoot[];
    connectionState: null | "connecting" | "connected";
    mounted: boolean;
    closing: boolean;
    seenEventNames: Set<string>;
}
interface ConnectedRoot {
    connected: true;
    component: Component<any, any>;
    wsState: WebSocketState;
    eventNames: Set<string>;
    aliases: Record<string, string | undefined>;
    allComponentsMap: Record<string, Component<any, any> | undefined>;
    onError: ErrorHandler | null;
}
export interface CSSState {
    id: string;
    atomicCSS: Record<string, string | undefined>;
    cssRules: string[];
    nextRuleIndex: number;
}
export declare type ChildMap<T> = Record<string, T[] | undefined>;
export interface StateTree {
    name: string;
    state: Record<string, any>;
    childMap: ChildMap<StateTree>;
    reload: boolean;
}
export interface EventHandler {
    eventName: string;
    callback: EventCallback;
    validator?: t.Type<any, any, any>;
    expiry: number | null;
}
export declare type ErrorHandler = (error: unknown) => void;
interface IDStateTree {
    id: string;
    stateTree: StateTree;
}
declare module "http" {
    interface IncomingMessage {
        purviewState?: {
            wsState: WebSocketState;
            idStateTrees: IDStateTree[];
            roots?: ConnectedRoot[];
        };
        purviewCSSState?: CSSState;
        purviewCSSRendered?: boolean;
    }
}
export declare const RENDER_CSS_ORDERING_ERROR = "Purview: you called renderCSS() and then subsequently called render(). Calls to render() must come before renderCSS() so that renderCSS() can add all relevant styles.";
export declare function createElem(nodeName: string | ComponentConstructor<any, any>, attributes: (JSX.InputHTMLAttributes & JSX.TextareaHTMLAttributes & JSX.OptionHTMLAttributes) | null, ...children: NestedArray<JSX.Child>): JSX.Element;
export declare function handleWebSocket(server: http.Server, options: WebSocketOptions): WebSocket.Server;
export declare function pingClients(wsServer: WebSocket.Server, timeout: number): void;
export declare function render(jsx: JSX.Element, req: http.IncomingMessage, options?: RenderOptions): Promise<string>;
export declare function renderCSS(req: http.IncomingMessage): Promise<string>;
export declare const reloadOptions: {
    saveStateTree(id: string, tree: StateTree): Promise<void>;
    getStateTree(id: string): Promise<StateTree | null>;
    deleteStateTree(id: string): Promise<void>;
    saveCSSState(id: string, cssState: CSSState): Promise<void>;
    getCSSState(id: string): Promise<CSSState | null>;
    deleteCSSState(id: string): Promise<void>;
};
export { Component };
export declare const scriptPath: string;
import { Purview } from "./namespace";
export default Purview;
export { InputEvent, ChangeEvent, SubmitEvent, KeyEvent, PurviewEvent, } from "./types/ws";
export { PurviewWebsocketEvent, } from "./client";
export { css, styledTag, CSS } from "./css";
export { JSX, NestedArray };
