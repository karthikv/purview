import { PNodeRegular } from "./types/ws";
import { JSX } from "./purview";
export interface NestedArray<T> extends Array<NestedArray<T> | T> {
}
declare type EventAttribute = keyof JSX.DOMAttributes;
export declare const EVENT_ATTRS: Set<string>;
export declare const CAPTURE_TEXT = "Capture";
export declare const STYLE_TAG_ID = "purview-css";
export declare const WS_PING_INTERVAL = 2000;
export declare const WS_PONG_TIMEOUT = 15000;
export declare function isEventAttr(attr: string): attr is EventAttribute;
export declare function toEventName(attr: EventAttribute): string;
export declare function tryParseJSON<T>(json: string): T;
export declare function parseHTML(html: string): Element;
export declare function eachNested<T>(array: NestedArray<T>, callback: (elem: T) => void): void;
export declare function findNested<T>(array: NestedArray<T>, callback: (elem: T) => boolean): T | null;
export declare function mapNested<T, U>(array: NestedArray<T>, callback: (elem: T) => U): U[];
export declare function virtualize({ nodeName, attributes, children, }: JSX.Element): PNodeRegular;
export declare function concretize(pNode: PNodeRegular, doc?: Document): Element;
export declare function isInput(node: Node): node is HTMLInputElement;
export declare function isOption(node: Node): node is HTMLOptionElement;
export declare function isSelect(node: Node): node is HTMLSelectElement;
export declare function isTextArea(node: Node): node is HTMLTextAreaElement;
export declare function isJSXElement(child: JSX.Child): child is JSX.Element;
export {};
