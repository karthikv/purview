"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.morph = exports.initMorph = exports.clearSetValueTimer = void 0;
const snabbdom = require("snabbdom");
const tovnode_1 = require("snabbdom/tovnode");
const attributes_1 = require("snabbdom/modules/attributes");
const helpers_1 = require("./helpers");
const controlInputsMod = {
    update(_, to) {
        const elem = to.elm;
        const attrs = to.data && to.data.attrs;
        if (!elem || !attrs) {
            return;
        }
        if (helpers_1.isInput(elem) && "data-controlled" in attrs) {
            if ("value" in attrs) {
                maybeSetValue(elem, String(attrs.value));
            }
            // Note that the checked attribute won't be set if it was false in JSX, so
            // we need to do this even if attrs doesn't have this property.
            elem.checked = Boolean(attrs.checked);
        }
        if (helpers_1.isOption(elem)) {
            // Find the parent select.
            let parent = elem.parentNode;
            if (parent && parent.nodeName === "OPTGROUP") {
                parent = parent.parentNode;
            }
            if (parent &&
                helpers_1.isSelect(parent) &&
                parent.hasAttribute("data-controlled")) {
                // Note that the selected attribute won't be set if it was false in JSX,
                // so we need to do this even if attrs doesn't have this property.
                elem.selected = Boolean(attrs.selected);
            }
        }
        if (helpers_1.isTextArea(elem) && "data-controlled" in attrs) {
            maybeSetValue(elem, to.children[0].text);
        }
    },
};
const setValueTimers = new WeakMap();
// We don't want to update a controlled input each time we get a response from
// the server, as the responses can be delayed with respect to user input. For
// instance, if the user is in the process of typing "abcd", before the user
// types "d", the server might send down the controlled value "ab". We'd then
// set the value to "ab" and the user would change the value to "abd". This
// causes various key presses to not take effect, and it's very confusing.
//
// To avoid this, we debounce setting the value property here.
function maybeSetValue(elem, value) {
    clearSetValueTimer(elem);
    const timer = setTimeout(() => (elem.value = value), 250);
    setValueTimers.set(elem, timer);
}
function clearSetValueTimer(elem) {
    const timer = setValueTimers.get(elem);
    if (timer) {
        clearTimeout(timer);
    }
}
exports.clearSetValueTimer = clearSetValueTimer;
function trackSubtree(_, to) {
    if (to.elm) {
        to.elm._vNode = to;
    }
}
const trackSubtreeMod = {
    create: trackSubtree,
    update: trackSubtree,
};
const patch = snabbdom.init([attributes_1.default, controlInputsMod, trackSubtreeMod]);
function initMorph(node) {
    normalize(tovnode_1.default(node), true);
}
exports.initMorph = initMorph;
function morph(from, to) {
    if (!from._vNode) {
        throw new Error("Can't morph: node has no associated virtual node");
    }
    if (!from._vNode.elm) {
        throw new Error("Can't morph: virtual node lacks an element");
    }
    if (from._vNode.elm !== from) {
        throw new Error("Can't morph: virtual node has invalid element");
    }
    const parentVNode = from.parentElement && from.parentElement._vNode;
    let childIndex;
    if (parentVNode) {
        childIndex = parentVNode.children.findIndex(c => c === from._vNode);
        if (childIndex === -1) {
            throw new Error("Can't morph: virtual node isn't a child of parent");
        }
    }
    normalize(to, false);
    from._vNode = patch(from._vNode, to);
    if (childIndex !== undefined && childIndex > -1) {
        parentVNode.children[childIndex] = from._vNode;
    }
}
exports.morph = morph;
function normalize(vNode, hydrate) {
    walk(vNode, v => {
        // During hydration, data isn't set in some cases, which causes an error
        // when morphing.
        if (hydrate && !v.data) {
            v.data = {};
        }
        // The id and classes are included in selectors by default. This means that
        // we'll create a new node if the id or classes change. We want to avoid
        // this and use the existing node so long as it has the same tag name.
        if (v.elm instanceof HTMLElement) {
            v.sel = v.elm.nodeName.toLowerCase();
            if (v.elm.hasAttribute("id")) {
                v.data.attrs.id = v.elm.getAttribute("id");
            }
            if (v.elm.hasAttribute("class")) {
                v.data.attrs.class = v.elm.getAttribute("class");
            }
        }
        if (hydrate && v.elm) {
            v.elm._vNode = v;
        }
        else {
            delete v.elm;
        }
        const attrs = v.data && v.data.attrs;
        if (attrs) {
            const dataKey = attrs["data-key"];
            if (typeof dataKey === "string" || typeof dataKey === "number") {
                v.key = dataKey;
            }
            if ("data-ignore-children" in attrs) {
                v.children = [];
            }
        }
    });
}
function walk(vNode, callback) {
    callback(vNode);
    if (vNode.children) {
        vNode.children.forEach(child => {
            if (typeof child !== "string") {
                walk(child, callback);
            }
        });
    }
}
//# sourceMappingURL=morph.js.map