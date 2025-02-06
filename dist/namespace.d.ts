import { createElem as createElemInternal, handleWebSocket as handleWebSocketInternal, render as renderInternal, renderCSS as renderCSSInternal, Component as ComponentInternal, JSX as JSXInternal } from "./purview";
export declare namespace Purview {
    let createElem: typeof createElemInternal;
    let handleWebSocket: typeof handleWebSocketInternal;
    let render: typeof renderInternal;
    let renderCSS: typeof renderCSSInternal;
    let Component: typeof ComponentInternal;
    let scriptPath: string;
    let reloadOptions: {
        saveStateTree(id: string, tree: import("./purview").StateTree): Promise<void>;
        getStateTree(id: string): Promise<import("./purview").StateTree | null>;
        deleteStateTree(id: string): Promise<void>;
        saveCSSState(id: string, cssState: import("./purview").CSSState): Promise<void>;
        getCSSState(id: string): Promise<import("./purview").CSSState | null>;
        deleteCSSState(id: string): Promise<void>;
    };
    export import JSX = JSXInternal;
}
