"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isJSXElement = exports.isTextArea = exports.isSelect = exports.isOption = exports.isInput = exports.concretize = exports.virtualize = exports.mapNested = exports.findNested = exports.eachNested = exports.parseHTML = exports.tryParseJSON = exports.toEventName = exports.isEventAttr = exports.WS_PONG_TIMEOUT = exports.WS_PING_INTERVAL = exports.STYLE_TAG_ID = exports.CAPTURE_TEXT = exports.EVENT_ATTRS = void 0;
const EVENT_ATTRS_MAP = {
    // Clipboard Events
    onCopy: true,
    onCopyCapture: true,
    onCut: true,
    onCutCapture: true,
    onPaste: true,
    onPasteCapture: true,
    // Composition Events
    onCompositionEnd: true,
    onCompositionEndCapture: true,
    onCompositionStart: true,
    onCompositionStartCapture: true,
    onCompositionUpdate: true,
    onCompositionUpdateCapture: true,
    // Focus Events
    onFocus: true,
    onFocusCapture: true,
    onBlur: true,
    onBlurCapture: true,
    // Form Events
    onChange: true,
    onChangeCapture: true,
    onInput: true,
    onInputCapture: true,
    onReset: true,
    onResetCapture: true,
    onSubmit: true,
    onSubmitCapture: true,
    onInvalid: true,
    onInvalidCapture: true,
    // Image Events
    onLoad: true,
    onLoadCapture: true,
    onError: true,
    onErrorCapture: true,
    // Keyboard Events
    onKeyDown: true,
    onKeyDownCapture: true,
    onKeyPress: true,
    onKeyPressCapture: true,
    onKeyUp: true,
    onKeyUpCapture: true,
    // MouseEvents
    onAuxClick: true,
    onClick: true,
    onClickCapture: true,
    onContextMenu: true,
    onContextMenuCapture: true,
    onDblClick: true,
    onDblClickCapture: true,
    onDrag: true,
    onDragCapture: true,
    onDragEnd: true,
    onDragEndCapture: true,
    onDragEnter: true,
    onDragEnterCapture: true,
    onDragExit: true,
    onDragExitCapture: true,
    onDragLeave: true,
    onDragLeaveCapture: true,
    onDragOver: true,
    onDragOverCapture: true,
    onDragStart: true,
    onDragStartCapture: true,
    onDrop: true,
    onDropCapture: true,
    onMouseDown: true,
    onMouseDownCapture: true,
    onMouseEnter: true,
    onMouseLeave: true,
    onMouseMove: true,
    onMouseMoveCapture: true,
    onMouseOut: true,
    onMouseOutCapture: true,
    onMouseOver: true,
    onMouseOverCapture: true,
    onMouseUp: true,
    onMouseUpCapture: true,
    // Touch Events
    onTouchCancel: true,
    onTouchCancelCapture: true,
    onTouchEnd: true,
    onTouchEndCapture: true,
    onTouchMove: true,
    onTouchMoveCapture: true,
    onTouchStart: true,
    onTouchStartCapture: true,
    // UI Events
    onScroll: true,
    onScrollCapture: true,
    // Wheel Events
    onWheel: true,
    onWheelCapture: true,
    // Animation Events
    onAnimationStart: true,
    onAnimationStartCapture: true,
    onAnimationEnd: true,
    onAnimationEndCapture: true,
    onAnimationIteration: true,
    onAnimationIterationCapture: true,
    // Transition Events
    onTransitionEnd: true,
    onTransitionEndCapture: true,
};
exports.EVENT_ATTRS = new Set(Object.keys(EVENT_ATTRS_MAP));
exports.CAPTURE_TEXT = "Capture";
exports.STYLE_TAG_ID = "purview-css";
exports.WS_PING_INTERVAL = 2000; // ms
exports.WS_PONG_TIMEOUT = 15000; // ms
function isEventAttr(attr) {
    return exports.EVENT_ATTRS.has(attr);
}
exports.isEventAttr = isEventAttr;
function toEventName(attr) {
    if (attr.indexOf(exports.CAPTURE_TEXT) === attr.length - exports.CAPTURE_TEXT.length) {
        return attr.slice(2, -exports.CAPTURE_TEXT.length).toLowerCase();
    }
    return attr.slice(2).toLowerCase();
}
exports.toEventName = toEventName;
function tryParseJSON(json) {
    try {
        return JSON.parse(json);
    }
    catch (_) {
        throw new Error(`Invalid JSON: ${json}`);
    }
}
exports.tryParseJSON = tryParseJSON;
function parseHTML(html) {
    const template = document.createElement("template");
    template.innerHTML = html;
    const fragment = document.importNode(template.content, true);
    return fragment.children[0];
}
exports.parseHTML = parseHTML;
function eachNested(array, callback) {
    array.forEach(elem => {
        if (elem instanceof Array) {
            eachNested(elem, callback);
        }
        else {
            callback(elem);
        }
    });
}
exports.eachNested = eachNested;
function findNested(array, callback) {
    for (const elem of array) {
        if (elem instanceof Array) {
            findNested(elem, callback);
        }
        else if (callback(elem)) {
            return elem;
        }
    }
    return null;
}
exports.findNested = findNested;
function mapNested(array, callback) {
    const mapped = new Array(array.length);
    let i = 0;
    eachNested(array, elem => {
        // Will naturally expand the array if it exceeds capacity.
        mapped[i] = callback(elem);
        i++;
    });
    mapped.length = i;
    return mapped;
}
exports.mapNested = mapNested;
function virtualize({ nodeName, attributes, children, }) {
    if (typeof nodeName !== "string") {
        throw new Error("Expected an intrinsic JSX element.");
    }
    const attrs = {};
    for (const key in attributes) {
        if (attributes.hasOwnProperty(key)) {
            attrs[key.toLowerCase()] = attributes[key];
        }
    }
    if (!(children instanceof Array)) {
        children = [children];
    }
    const vChildren = [];
    eachNested(children, child => {
        if (isJSXElement(child)) {
            vChildren.push(virtualize(child));
        }
        else if (child !== null && child !== undefined) {
            vChildren.push({ text: String(child) });
        }
    });
    return {
        sel: nodeName,
        data: { attrs },
        children: vChildren,
    };
}
exports.virtualize = virtualize;
function concretize(pNode, doc) {
    if (!doc) {
        doc = document;
    }
    const elem = doc.createElement(pNode.sel);
    const { data, children } = pNode;
    if (data.attrs) {
        const attrs = data.attrs;
        for (const key in attrs) {
            if (attrs.hasOwnProperty(key)) {
                if (attrs[key] === true) {
                    elem.setAttribute(key, "");
                }
                else {
                    elem.setAttribute(key, attrs[key]);
                }
            }
        }
    }
    children.forEach(child => {
        if ("text" in child) {
            elem.appendChild(doc.createTextNode(child.text));
        }
        else {
            elem.appendChild(concretize(child, doc));
        }
    });
    return elem;
}
exports.concretize = concretize;
function isInput(node) {
    return node.nodeName === "INPUT";
}
exports.isInput = isInput;
function isOption(node) {
    return node.nodeName === "OPTION";
}
exports.isOption = isOption;
function isSelect(node) {
    return node.nodeName === "SELECT";
}
exports.isSelect = isSelect;
function isTextArea(node) {
    return node.nodeName === "TEXTAREA";
}
exports.isTextArea = isTextArea;
function isJSXElement(child) {
    return child !== null && typeof child === "object" && "nodeName" in child;
}
exports.isJSXElement = isJSXElement;
//# sourceMappingURL=helpers.js.map