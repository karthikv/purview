"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientMessageValidator = exports.keyEventValidator = exports.submitEventValidator = exports.makeChangeEventValidator = exports.makeInputEventValidator = void 0;
const t = require("io-ts");
// ------------------------------------------------------------------------
// N.B. If you change validators here, make sure to update src/types/ws.ts!
// ------------------------------------------------------------------------
exports.makeInputEventValidator = (type) => t.exact(t.type({ name: t.string, value: type }));
const inputEventStringValidator = exports.makeInputEventValidator(t.string);
check();
check();
exports.makeChangeEventValidator = exports.makeInputEventValidator;
const changeEventStringValidator = exports.makeChangeEventValidator(t.string);
check();
check();
exports.submitEventValidator = t.exact(t.type({ fields: t.Dictionary }));
check();
check();
exports.keyEventValidator = t.exact(t.type({ name: t.string, key: t.string }));
check();
check();
const connectMessageValidator = t.exact(t.intersection([
    t.type({
        type: t.literal("connect"),
        rootIDs: t.array(t.string),
    }),
    t.partial({ cssStateID: t.string }),
]));
check();
check();
const eventMessageValidator = t.exact(t.intersection([
    t.type({
        type: t.literal("event"),
        rootID: t.string,
        componentID: t.string,
        eventID: t.string,
    }),
    t.partial({ event: t.any }),
]));
check();
check();
const seenEventNamesMessageValidator = t.exact(t.type({
    type: t.literal("seenEventNames"),
    seenEventNames: t.array(t.string),
}));
check();
check();
const nextRuleIndexMessageValidator = t.exact(t.type({
    type: t.literal("nextRuleIndex"),
    nextRuleIndex: t.number,
}));
check();
check();
exports.clientMessageValidator = t.taggedUnion("type", [
    connectMessageValidator,
    eventMessageValidator,
    seenEventNamesMessageValidator,
    nextRuleIndexMessageValidator,
]);
check();
check();
function check() {
    return true;
}
//# sourceMappingURL=validators.js.map