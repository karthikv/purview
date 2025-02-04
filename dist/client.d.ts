declare global {
    interface WindowEventMap {
        "purview": CustomEvent<PurviewWebsocketEvent>;
    }
}
export declare type PurviewWebsocketEvent = {
    type: "websocket:open" | "websocket:close" | "websocket:error";
    data?: {
        retries?: number;
        event?: Event;
    };
};
export declare const dispatchPurviewEvent: (event: PurviewWebsocketEvent) => void;
export declare function connectWebSocket(location: Location): WebSocket;
export declare function pingServer(ws: WebSocket, timeout: number): void;
