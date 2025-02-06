"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("./client");
// Polyfill closest() for browsers that don't support it.
if (!Element.prototype.closest) {
    Element.prototype.closest = function (selector) {
        if (!document.documentElement.contains(this)) {
            return null;
        }
        let elem = this;
        do {
            if (elem.matches(selector)) {
                return elem;
            }
            elem = elem.parentElement;
        } while (elem !== null);
        return null;
    };
}
function onDOMLoad(callback) {
    if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", callback);
    }
    else {
        callback();
    }
}
// It's very important to wait for the DOM to load here. In the past, we didn't
// wait, and that introduced a race condition where initMorph() could
// potentially complete before the DOM was fully loaded. This would cause the
// virtual DOM to be out of sync with the real DOM (i.e. the virtual DOM would
// miss elements that exist in the real DOM because the real DOM hadn't fully
// loaded). Then, upon the first WebSocket update, our reconciliation would
// create duplicate elements/components due to the desynced virtual DOM.
onDOMLoad(() => client_1.connectWebSocket(window.location));
//# sourceMappingURL=browser.js.map