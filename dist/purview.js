"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scriptPath = exports.Component = exports.reloadOptions = exports.renderCSS = exports.render = exports.pingClients = exports.handleWebSocket = exports.createElem = exports.RENDER_CSS_ORDERING_ERROR = void 0;
const http = require("http");
const pathLib = require("path");
const util = require("util");
const WebSocket = require("ws");
const nanoid_1 = require("nanoid");
const t = require("io-ts");
const component_1 = require("./component");
exports.Component = component_1.default;
const helpers_1 = require("./helpers");
const validators_1 = require("./validators");
const DevNull = require("dev-null");
const to_html_1 = require("./to_html");
const css_1 = require("./css");
const constants_1 = require("./constants");
const INPUT_TYPE_VALIDATOR = {
    checkbox: t.boolean,
    number: t.number,
};
const cachedEventIDs = new WeakMap();
// By definition, the onError handler is expected to have side effects, so it
// is important that each error is passed to it exactly once.
//
// We keep track of errors that have already been passed to the onError handler
// below such that the same error is never passed twice. For example, an error
// that occurs in a component.render() call caused by an event callback (e.g.
// an awaited component.setState() that subsequently triggers a render) could
// otherwise be passed to onError more than once.
const seenErrors = new WeakSet();
const WEBSOCKET_BAD_STATUS_FORMAT = "Purview: request to your server (GET %s) returned status code %d, so we couldn't start the WebSocket connection.";
const WEBSOCKET_NO_RENDER_FORMAT = "Purview: request to your server (GET %s) didn't render any components, so we couldn't start the WebSocket connection.";
exports.RENDER_CSS_ORDERING_ERROR = "Purview: you called renderCSS() and then subsequently called render(). Calls to render() must come before renderCSS() so that renderCSS() can add all relevant styles.";
const RENDER_CSS_NOT_CALLED_ERROR = "Purview: You attempted to use the css attribute in a tag, but renderCSS was never called, so Purview could not add styles. Make sure to call renderCSS and include its output in the head tag during the initial render.";
function createElem(nodeName, attributes, ...children) {
    attributes = attributes || {};
    const hasSelected = (nodeName === "option" && attributes.selected !== undefined) ||
        (nodeName === "select" && containsControlledOption(children));
    const isValueInput = (nodeName === "input" &&
        (!attributes.type || attributes.type === "text")) ||
        nodeName === "textarea";
    const hasValue = isValueInput && attributes.value !== undefined;
    const isCheckedInput = nodeName === "input" &&
        (attributes.type === "checkbox" || attributes.type === "radio");
    const hasChecked = isCheckedInput && attributes.checked !== undefined;
    if (hasSelected || hasValue || hasChecked) {
        ;
        attributes["data-controlled"] = true;
    }
    if (isValueInput &&
        attributes.defaultValue !== undefined &&
        attributes.value === undefined) {
        attributes.value = attributes.defaultValue;
        delete attributes.defaultValue;
    }
    // Must come after the defaultValue case is handled above. This ensures the
    // defaultValue is properly written to the children.
    if (nodeName === "textarea" && attributes.value !== undefined) {
        children = [attributes.value];
        delete attributes.value;
    }
    if (isCheckedInput &&
        attributes.defaultChecked !== undefined &&
        attributes.checked === undefined) {
        attributes.checked = attributes.defaultChecked;
        delete attributes.defaultChecked;
    }
    if (nodeName === "option" &&
        attributes.defaultSelected !== undefined &&
        attributes.selected === undefined) {
        attributes.selected = attributes.defaultSelected;
        delete attributes.defaultSelected;
    }
    // For intrinsic elements, change special attributes to data-* equivalents and
    // remove falsy attributes.
    if (typeof nodeName === "string") {
        if (attributes.key !== undefined) {
            ;
            attributes["data-key"] = attributes.key;
            delete attributes.key;
        }
        if (attributes.ignoreChildren) {
            ;
            attributes["data-ignore-children"] = true;
            delete attributes.ignoreChildren;
        }
        Object.keys(attributes).forEach(key => {
            const value = attributes[key];
            if (value === null || value === undefined || value === false) {
                delete attributes[key];
            }
        });
    }
    if (children.length === 1) {
        return { nodeName, attributes, children: children[0] };
    }
    else {
        return { nodeName, attributes, children };
    }
}
exports.createElem = createElem;
function containsControlledOption(children) {
    if (children instanceof Array) {
        const controlled = helpers_1.findNested(children, child => {
            if (!helpers_1.isJSXElement(child)) {
                return false;
            }
            if (child.nodeName === "optgroup") {
                return containsControlledOption(child.children);
            }
            else {
                return isControlledOption(child);
            }
        });
        return Boolean(controlled);
    }
    else {
        return helpers_1.isJSXElement(children) && isControlledOption(children);
    }
}
function isControlledOption(jsx) {
    return jsx.nodeName === "option" && "data-controlled" in jsx.attributes;
}
function handleWebSocket(server, options) {
    const wsServer = new WebSocket.Server({
        server,
        verifyClient(info) {
            return options.origin === null || info.origin === options.origin;
        },
    });
    wsServer.on("connection", (ws, req) => {
        if (req.method !== "GET") {
            throw new Error("Only GET requests are supported");
        }
        const wsStateBase = {
            ws,
            roots: [],
            connectionState: null,
            mounted: false,
            closing: false,
            seenEventNames: new Set(),
            hasCSS: false,
        };
        // wsStateBase is narrowed here to WebSocketStateNoCSS. This can be
        // problematic in the handlers below because it may have changed to
        // WebSocketStateHasCSS via the connect message. To avoid this, explicitly
        // widen the type here.
        const wsState = wsStateBase;
        ws.on("message", async (rawData, isBinary) => {
            if (isBinary) {
                return;
            }
            const data = rawData.toString();
            if (data === "ping") {
                ws.send("pong");
                return;
            }
            const parsed = helpers_1.tryParseJSON(data);
            const decoded = validators_1.clientMessageValidator.decode(parsed);
            if (decoded.isRight()) {
                await handleMessage(decoded.value, wsState, req, server);
            }
        });
        ws.on("close", async () => {
            wsState.closing = true;
            // Because both the "close" and "connect" events are async, we check if
            // `connectionState` is set to "connected" because it could be the case
            // that the "close" event fires just after the "connect" event (e.g., on
            // page refresh), and the "close" event will see that the `wsState.roots`
            // is an empty array due to the "connect" event still being in progress.
            // This would result in an incomplete clean up of the previous
            // connection's state. Hence, we return early, set the `closing` flag, and
            // let the "connect" event clean up the existing state by signaling with
            // `closing`.
            if (wsState.connectionState !== "connected") {
                return;
            }
            await cleanUpWebSocketState(wsState);
            wsState.closing = false;
        });
    });
    // Send pings periodically and terminate if no pong.
    const interval = setInterval(() => pingClients(wsServer, helpers_1.WS_PONG_TIMEOUT), helpers_1.WS_PING_INTERVAL);
    wsServer.on("close", () => clearInterval(interval));
    server.on("close", () => wsServer.close());
    return wsServer;
}
exports.handleWebSocket = handleWebSocket;
const terminationTimers = new WeakMap();
// If a client doesn't respond with a pong in the timeout (given in
// milliseconds), forcibly terminate the connection.
function pingClients(wsServer, timeout) {
    for (const ws of wsServer.clients) {
        // If a WebSocket is in the closing state, ws.ping() (which is called
        // further below) will throw the following error: Error: WebSocket is not
        // open: readyState 2 (CLOSING)
        //
        // Prevent this from happening by checking the state.
        if (ws.readyState !== WebSocket.OPEN) {
            continue;
        }
        if (!terminationTimers.has(ws)) {
            // First time we're processing this websocket; listen for pongs to clear
            // the termination timer.
            ws.on("pong", () => {
                const timer = terminationTimers.get(ws);
                if (timer) {
                    clearTimeout(timer);
                }
                // N.B. We want to maintain an association in the WeakMap so that we
                // don't add another pong handler.
                terminationTimers.set(ws, null);
            });
        }
        // If no termination timer is set, either because one has never been set, or
        // because the last was cleared from a pong, set one.
        if (!terminationTimers.get(ws)) {
            terminationTimers.set(ws, setTimeout(() => ws.terminate(), timeout));
        }
        // Ask the client to send us a pong.
        ws.ping();
    }
}
exports.pingClients = pingClients;
function makeStateTree(component, reload) {
    const childMap = {};
    Object.keys(component._childMap).forEach(key => {
        const children = component._childMap[key];
        childMap[key] = children.map(c => makeStateTree(c, reload));
    });
    const componentConstructor = component.constructor;
    return {
        name: componentConstructor.getUniqueName(),
        state: component.state,
        childMap,
        reload,
    };
}
async function handleMessage(message, wsState, req, server) {
    switch (message.type) {
        case "connect": {
            if (wsState.connectionState !== null) {
                break;
            }
            wsState.connectionState = "connecting";
            const cssStateID = message.cssStateID;
            if (cssStateID) {
                const cssState = await exports.reloadOptions.getCSSState(cssStateID);
                if (!cssState) {
                    // Can't load CSS state; close WebSocket and force refresh.
                    wsState.ws.close();
                    return;
                }
                wsState.hasCSS = true;
                wsState.cssState = cssState;
            }
            if (message.rootIDs.length === 0) {
                throw new Error("Purview: no rootIDs provided.");
            }
            const promises = message.rootIDs.map(async (id) => {
                return { id, stateTree: await exports.reloadOptions.getStateTree(id) };
            });
            const idStateTrees = await Promise.all(promises);
            if (idStateTrees.some(ist => !ist.stateTree)) {
                // Can't load state tree; close WebSocket and force refresh.
                wsState.ws.close();
                return;
            }
            req.purviewState = {
                wsState,
                idStateTrees: idStateTrees,
            };
            const res = new http.ServerResponse(req);
            const nullStream = new DevNull();
            res.assignSocket(nullStream);
            server.emit("request", req, res);
            const roots = await new Promise((resolve, reject) => {
                res.on("finish", () => {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        const errorMessage = util.format(WEBSOCKET_BAD_STATUS_FORMAT, req.url, res.statusCode);
                        reject(new Error(errorMessage));
                    }
                    else if (req.purviewState.roots) {
                        resolve(req.purviewState.roots);
                    }
                    else {
                        const errorMessage = util.format(WEBSOCKET_NO_RENDER_FORMAT, req.url);
                        reject(new Error(errorMessage));
                    }
                });
            });
            roots.forEach(root => {
                root.wsState = wsState;
                wsState.roots.push(root);
                sendMessage(root.wsState.ws, {
                    type: "update",
                    componentID: root.component._id,
                    pNode: toLatestPNode(root.component._pNode),
                    newEventNames: Array.from(root.eventNames),
                });
                // Don't wait for this, since we want wsState.mounted and wsState.roots
                // to be updated atomically. Mounting is an asynchronous event anyway.
                void root.component._triggerMount(root.allComponentsMap);
            });
            wsState.mounted = true;
            const deletePromises = message.rootIDs.map(id => exports.reloadOptions.deleteStateTree(id));
            if (cssStateID) {
                deletePromises.push(exports.reloadOptions.deleteCSSState(cssStateID));
            }
            await Promise.all(deletePromises);
            wsState.connectionState = "connected";
            // Because both the "close" and "connect" events are async, we check if
            // `closing` is set because it could be the case that the "close" event
            // fires just after the "connect" event (e.g., on page refresh), and the
            // "close" event will see that the `wsState.roots` is an empty array due
            // to the "connect" event still being in progress. This would result in an
            // incomplete cleanup of the previous connection's state. Hence, we check
            // the `closing` flag and clean up any existing state that the "closing"
            // event could not clean up if needed.
            if (wsState.closing) {
                await cleanUpWebSocketState(wsState);
                wsState.closing = false;
            }
            break;
        }
        case "event": {
            const root = wsState.roots.find(r => r.component._id === message.rootID);
            if (!root) {
                break;
            }
            let component = root.allComponentsMap[message.componentID];
            if (!component) {
                break;
            }
            // The component might directly nest another component, at which point the
            // handler will be in the nested component due to component ID aliasing.
            // Note that this can happen recursively.
            while (component._directlyNests) {
                // TS requires us to annotate variables within this loop becuase they
                // are referenced indirectly in their initializers.
                const keys = Object.keys(component._childMap);
                if (keys.length !== 1) {
                    throw new Error("Expected exactly one key for directly nested component");
                }
                const children = component._childMap[keys[0]];
                if (!children || children.length !== 1) {
                    throw new Error("Expected exactly one child for directly nested component");
                }
                const child = children[0];
                if (!(child instanceof component_1.default)) {
                    throw new Error("Expected child to be a component");
                }
                component = child;
            }
            const handler = component._eventHandlers[message.eventID];
            if (!handler) {
                break;
            }
            if (handler.validator) {
                const decoded = handler.validator.decode(message.event);
                if (decoded.isRight()) {
                    await handler.callback(decoded.value);
                }
            }
            else {
                await handler.callback();
            }
            break;
        }
        case "seenEventNames": {
            wsState.seenEventNames = new Set(message.seenEventNames);
            break;
        }
        case "nextRuleIndex": {
            const { cssState } = wsState;
            if (cssState) {
                cssState.nextRuleIndex = Math.max(cssState.nextRuleIndex, message.nextRuleIndex);
            }
            break;
        }
    }
}
function sendMessage(ws, message) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify(message));
    }
}
async function render(jsx, req, options = {}) {
    var _a;
    const onError = (_a = options.onError) !== null && _a !== void 0 ? _a : null;
    if (!isComponentElem(jsx)) {
        throw new Error("Root element must be a Purview.Component");
    }
    const purviewState = req.purviewState;
    let idStateTree;
    if (purviewState) {
        idStateTree = purviewState.idStateTrees.find(ist => ist.stateTree.name === jsx.nodeName.getUniqueName());
    }
    const stateTree = idStateTree && idStateTree.stateTree;
    return await withComponent(jsx, stateTree, async (component) => {
        var _a;
        if (!component) {
            throw new Error("Expected non-null component");
        }
        let onUnseenError = null;
        if (onError) {
            onUnseenError = error => {
                if (typeof error !== "object" || error === null) {
                    onError(error);
                    return;
                }
                if (!seenErrors.has(error)) {
                    seenErrors.add(error);
                    onError(error);
                }
            };
        }
        let root;
        if (purviewState) {
            // This is the request from the websocket connection.
            component._id = idStateTree.id;
            root = {
                connected: true,
                component,
                wsState: purviewState.wsState,
                eventNames: new Set(),
                aliases: {},
                allComponentsMap: { [component._id]: component },
                onError: onUnseenError,
            };
            purviewState.roots = purviewState.roots || [];
            purviewState.roots.push(root);
        }
        else {
            // This is the initial render.
            req.purviewCSSState = (_a = req.purviewCSSState) !== null && _a !== void 0 ? _a : {
                id: nanoid_1.nanoid(),
                atomicCSS: {},
                cssRules: [],
                nextRuleIndex: 0,
            };
            if (req.purviewCSSRendered) {
                throw new Error(exports.RENDER_CSS_ORDERING_ERROR);
            }
            root = {
                connected: false,
                cssState: req.purviewCSSState,
                onError: onUnseenError,
            };
        }
        const pNode = await renderComponent(component, component._id, root);
        if (!pNode) {
            throw new Error("Expected non-null node");
        }
        if (purviewState) {
            return "";
        }
        else {
            await exports.reloadOptions.saveStateTree(component._id, makeStateTree(component, false));
            return to_html_1.toHTML(pNode);
        }
    });
}
exports.render = render;
async function renderCSS(req) {
    const cssState = req.purviewCSSState;
    if (!cssState) {
        req.purviewCSSRendered = true;
        return "";
    }
    const { id, cssRules } = cssState;
    const textPNode = createTextPNode(cssRules.join("\n"));
    const pNode = createPNode("style", { id: helpers_1.STYLE_TAG_ID, "data-css-state-id": id }, [textPNode]);
    cssState.nextRuleIndex = cssRules.length;
    await exports.reloadOptions.saveCSSState(id, cssState);
    req.purviewCSSRendered = true;
    return to_html_1.toHTML(pNode);
}
exports.renderCSS = renderCSS;
function isComponentElem(jsx) {
    return (typeof jsx.nodeName === "function" &&
        jsx.nodeName.prototype &&
        jsx.nodeName.prototype._isPurviewComponent);
}
async function makeElem(jsx, parent, rootID, root, parentKey) {
    let key;
    if (isComponentElem(jsx)) {
        key = parentKey + "/" + jsx.nodeName.getUniqueName();
        const cached = parent._childMap[key];
        const existing = cached ? cached.shift() : null;
        if (!parent._newChildMap[key]) {
            parent._newChildMap[key] = [];
        }
        // Retain the ordering of child elements by saving the index here.
        const index = parent._newChildMap[key].length;
        parent._newChildMap[key].push(null);
        return await withComponent(jsx, existing, async (component) => {
            if (!component) {
                return null;
            }
            parent._newChildMap[key][index] = component;
            const pNode = await renderComponent(component, rootID, root);
            const wsState = root.connected && root.wsState;
            if (!existing && wsState && wsState.mounted) {
                // Child components have already been mounted recursively. We don't call
                // _triggerMount() because that would recursively call componentDidMount()
                // on children again.
                component._mountSelfLocked(root.connected ? root.allComponentsMap : null);
            }
            return pNode;
        });
    }
    return makeRegularElem(jsx, parent, rootID, root, parentKey);
}
async function makeRegularElem(jsx, parent, rootID, root, parentKey) {
    if (typeof jsx.nodeName !== "string") {
        throw new Error("Invalid JSX node: " + jsx.nodeName);
    }
    const { nodeName, attributes: allAttributes, children } = jsx;
    const { css } = allAttributes, attributes = __rest(allAttributes, ["css"]);
    const attrs = {};
    Object.keys(attributes).forEach(attr => {
        if (!helpers_1.isEventAttr(attr)) {
            const value = attributes[attr];
            const type = typeof value;
            if (type === "string" || type === "boolean" || type === "number") {
                attrs[attr.toLowerCase()] = value;
            }
            return;
        }
        const eventName = helpers_1.toEventName(attr);
        const callback = attributes[attr];
        let eventID = cachedEventIDs.get(callback);
        if (!eventID) {
            eventID = nanoid_1.nanoid();
            cachedEventIDs.set(callback, eventID);
        }
        if (root.connected) {
            parent._newEventHandlers[eventID] = {
                eventName,
                async callback(event) {
                    var _a;
                    try {
                        await callback(event);
                    }
                    catch (error) {
                        (_a = root.onError) === null || _a === void 0 ? void 0 : _a.call(root, error);
                        if (process.env.NODE_ENV !== "test" || !root.onError) {
                            throw error;
                        }
                    }
                },
                expiry: null,
            };
            root.eventNames.add(eventName);
            let validator;
            switch (eventName) {
                case "input":
                case "change":
                    let makeValidator = validators_1.makeInputEventValidator;
                    if (eventName === "change") {
                        makeValidator = validators_1.makeChangeEventValidator;
                    }
                    if (nodeName === "input") {
                        const type = attributes.type;
                        validator = makeValidator(INPUT_TYPE_VALIDATOR[type] || t.string);
                    }
                    else if (nodeName === "select") {
                        const multiple = attributes.multiple;
                        validator = makeValidator(multiple ? t.array(t.string) : t.string);
                    }
                    else if (nodeName === "textarea") {
                        validator = makeValidator(t.string);
                    }
                    else {
                        // Could be a parent of an input/select/textarea, or a custom
                        // element. Leave validation up to the user.
                        validator = makeValidator(t.any);
                    }
                    break;
                case "keydown":
                case "keypress":
                case "keyup":
                    validator = validators_1.keyEventValidator;
                    break;
                case "submit":
                    validator = validators_1.submitEventValidator;
                    break;
            }
            parent._newEventHandlers[eventID].validator = validator;
        }
        if (attr.indexOf(helpers_1.CAPTURE_TEXT) !== -1) {
            attrs["data-" + eventName + "-capture"] = eventID;
        }
        else {
            attrs["data-" + eventName] = eventID;
        }
    });
    if (css) {
        let cssState;
        if (root.connected) {
            if (!root.wsState.hasCSS) {
                throw new Error(RENDER_CSS_NOT_CALLED_ERROR);
            }
            cssState = root.wsState.cssState;
        }
        else {
            cssState = root.cssState;
        }
        const classNames = [];
        const aps = css_1.getAtomicProperties(css);
        for (const ap of aps) {
            const ruleTemplate = css_1.generateRuleTemplate(ap);
            let className = cssState.atomicCSS[ruleTemplate];
            if (className === undefined) {
                className = css_1.generateClass(cssState.cssRules.length);
                cssState.atomicCSS[ruleTemplate] = className;
                cssState.cssRules.push(css_1.generateRule(className, ruleTemplate));
            }
            classNames.push(className);
        }
        if (typeof attrs.class === "string") {
            attrs.class += " " + classNames.join(" ");
        }
        else {
            attrs.class = classNames.join(" ");
        }
    }
    let vChildren;
    // Most common case: leaf text node.
    if (typeof children === "string") {
        vChildren = [createTextPNode(children)];
    }
    else if (children instanceof Array) {
        const promises = helpers_1.mapNested(children, child => makeChild(child, parent, rootID, root, parentKey + "/" + nodeName));
        vChildren = await Promise.all(promises);
        // Remove nulls in place to save memory.
        let nextIndex = 0;
        for (const vChild of vChildren) {
            if (vChild) {
                vChildren[nextIndex] = vChild;
                nextIndex++;
            }
        }
        vChildren.length = nextIndex;
    }
    else {
        const key = parentKey + "/" + nodeName;
        const child = await makeChild(children, parent, rootID, root, key);
        vChildren = child ? [child] : [];
    }
    return createPNode(nodeName, attrs, vChildren);
}
function makeChild(child, parent, rootID, root, parentKey) {
    if (child === null || child === undefined || child === false) {
        return null;
    }
    if (typeof child === "object") {
        return makeElem(child, parent, rootID, root, parentKey);
    }
    else {
        return createTextPNode(String(child));
    }
}
async function withComponent(jsx, existing, callback, root) {
    const { nodeName, attributes, children } = jsx;
    const props = Object.assign({ children }, attributes);
    let component;
    if (existing instanceof component_1.default) {
        component = existing;
    }
    else {
        component = new nodeName(props);
    }
    return component._lock(async () => {
        var _a;
        if (component._unmounted) {
            return callback(null);
        }
        let stateInitialized;
        if (existing instanceof component_1.default) {
            component._setProps(props);
            component._applyChangesetsLocked();
        }
        else if (existing) {
            component._childMap = existing.childMap;
            stateInitialized = component._initState(existing.state, existing.reload);
        }
        else {
            stateInitialized = component._initState();
        }
        try {
            await stateInitialized;
        }
        catch (error) {
            (_a = root === null || root === void 0 ? void 0 : root.onError) === null || _a === void 0 ? void 0 : _a.call(root, error);
            throw error;
        }
        return callback(component);
    });
}
async function renderComponent(component, rootID, root) {
    var _a;
    component._newChildMap = {};
    component._newEventHandlers = {};
    let jsx;
    try {
        jsx = component.render();
    }
    catch (error) {
        (_a = root.onError) === null || _a === void 0 ? void 0 : _a.call(root, error);
        throw error;
    }
    const pNode = (await makeElem(jsx, component, rootID, root, ""));
    if (!pNode) {
        return null;
    }
    pNode.component = component;
    component._pNode = pNode;
    unmountChildren(component, root);
    const newChildMap = {};
    Object.keys(component._newChildMap).forEach(key => {
        newChildMap[key] = component._newChildMap[key].filter(c => c !== null);
    });
    component._childMap = newChildMap;
    replaceEventHandlers(component, constants_1.EVENT_HANDLER_GRACE_PERIOD_MS);
    if (root.connected && !component._handleUpdate) {
        component._handleUpdate = async () => {
            const newPNode = await renderComponent(component, rootID, root);
            if (!newPNode) {
                return;
            }
            const newEventNames = new Set();
            root.eventNames.forEach(name => {
                if (!root.wsState.seenEventNames.has(name)) {
                    newEventNames.add(name);
                }
            });
            let cssUpdates;
            if (root.wsState.hasCSS) {
                const { cssState: { cssRules, nextRuleIndex }, } = root.wsState;
                const newCSSRules = cssRules.slice(nextRuleIndex);
                if (newCSSRules.length > 0) {
                    cssUpdates = { newCSSRules, nextRuleIndex };
                }
            }
            sendMessage(root.wsState.ws, {
                type: "update",
                componentID: unalias(component._id, root),
                pNode: toLatestPNode(newPNode),
                newEventNames: Array.from(newEventNames),
                cssUpdates,
            });
        };
    }
    // If this component directly nests another component, a component ID will
    // already exist on elem. In this case, we override the component ID in the
    // data-component-id attribute, but keep track of the mapping in our aliases
    // map. This lets us send the proper ID in update messages to the client (see
    // the _handleUpdate function above).
    //
    // It's possible for componentID to be fully unaliased (i.e. the highest
    // ancestor in the directly nested chain) if this is the second (or later)
    // time we're rendering a nested component due to how we set the unaliased ID
    // further below. We don't add an alias in this case to avoid cyles.
    const componentID = pNode.data.attrs["data-component-id"];
    const unaliasedID = root.connected
        ? unalias(component._id, root)
        : component._id;
    if (root.connected && componentID && componentID !== unaliasedID) {
        root.aliases[componentID] = unaliasedID;
    }
    component._directlyNests = Boolean(componentID);
    // We may re-render a directly nested component without re-rendering the
    // parent, so we need to use the unaliased ID.
    pNode.data.attrs["data-component-id"] = unaliasedID;
    if (unaliasedID === rootID) {
        pNode.data.attrs["data-root"] = true;
    }
    return pNode;
}
// If an event handler is changed during a re-render, concurrent inflight events
// may be dropped if we disassociate the old handler from the component
// immediately. Prevent this by retaining old event handlers for a grace period.
// This can happen most commonly with a controlled input.
function replaceEventHandlers(component, gracePeriodMS) {
    const expiry = Date.now() + gracePeriodMS;
    for (const eventID of Object.keys(component._eventHandlers)) {
        const handler = component._eventHandlers[eventID];
        if (typeof handler.expiry !== "number") {
            handler.expiry = expiry;
        }
    }
    setTimeout(() => pruneEventHandlers(component), gracePeriodMS + 1);
    // N.B. Any event handlers that are retained in the new render will have their
    // expiry set back to null because of this assignment.
    Object.assign(component._eventHandlers, component._newEventHandlers);
}
function pruneEventHandlers(component) {
    const now = Date.now();
    for (const eventID of Object.keys(component._eventHandlers)) {
        const handler = component._eventHandlers[eventID];
        if (typeof handler.expiry === "number" && now >= handler.expiry) {
            delete component._eventHandlers[eventID];
        }
    }
}
function createPNode(sel, attrs, children) {
    return { sel, data: { attrs }, children };
}
function createTextPNode(text) {
    return { text };
}
function toLatestPNode(pNode) {
    if (pNode.component) {
        pNode = pNode.component._pNode;
    }
    const newChildren = pNode.children.map(child => {
        if ("text" in child) {
            return child;
        }
        else {
            return toLatestPNode(child);
        }
    });
    return {
        sel: pNode.sel,
        data: { attrs: Object.assign({}, pNode.data.attrs) },
        children: newChildren,
    };
}
function unmountChildren(component, root) {
    Object.keys(component._childMap).forEach(key => {
        const children = component._childMap[key];
        children.forEach(child => {
            if (child instanceof component_1.default) {
                // Don't wait for this; unmounting is an asynchronous event.
                void child._triggerUnmount(root.connected ? root.allComponentsMap : null);
            }
        });
    });
}
function unalias(id, root) {
    let alias = root.aliases[id];
    while (alias) {
        id = alias;
        alias = root.aliases[id];
    }
    return id;
}
async function cleanUpWebSocketState(wsState) {
    const promises = wsState.roots.map(async (root) => {
        const stateTree = makeStateTree(root.component, true);
        await exports.reloadOptions.saveStateTree(root.component._id, stateTree);
        await root.component._triggerUnmount(root.allComponentsMap);
    });
    if (wsState.hasCSS) {
        const cssPromise = exports.reloadOptions.saveCSSState(wsState.cssState.id, wsState.cssState);
        promises.push(cssPromise);
    }
    await Promise.all(promises);
}
const globalStateTrees = {};
const globalCSSState = {};
const DELETE_INTERVAL = 60 * 1000; // 60 seconds
exports.reloadOptions = {
    async saveStateTree(id, tree) {
        globalStateTrees[id] = tree;
        if (process.env.NODE_ENV !== "test") {
            setTimeout(() => this.deleteStateTree(id), DELETE_INTERVAL);
        }
    },
    async getStateTree(id) {
        var _a;
        return (_a = globalStateTrees[id]) !== null && _a !== void 0 ? _a : null;
    },
    async deleteStateTree(id) {
        delete globalStateTrees[id];
    },
    async saveCSSState(id, cssState) {
        globalCSSState[id] = cssState;
        if (process.env.NODE_ENV !== "test") {
            setTimeout(() => this.deleteCSSState(id), DELETE_INTERVAL);
        }
    },
    async getCSSState(id) {
        var _a;
        return (_a = globalCSSState[id]) !== null && _a !== void 0 ? _a : null;
    },
    async deleteCSSState(id) {
        delete globalCSSState[id];
    },
};
exports.scriptPath = pathLib.resolve(__dirname, "..", "dist", "bundle", "browser.js");
// Export all values above on the default object as well. Do this through
// a namespace so we can use a locally scoped JSX namespace:
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#locally-scoped-jsx-namespaces
const namespace_1 = require("./namespace");
exports.default = namespace_1.Purview;
var css_2 = require("./css");
Object.defineProperty(exports, "css", { enumerable: true, get: function () { return css_2.css; } });
Object.defineProperty(exports, "styledTag", { enumerable: true, get: function () { return css_2.styledTag; } });
//# sourceMappingURL=purview.js.map