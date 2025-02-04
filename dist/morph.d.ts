import { VNode } from "snabbdom/vnode";
import { PNode } from "./types/ws";
declare global {
    interface Node {
        _vNode?: VNode;
    }
}
export declare function clearSetValueTimer(elem: HTMLElement): void;
export declare function initMorph(node: Node): void;
export declare function morph(from: Node, to: PNode): void;
