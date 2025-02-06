"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const purview_1 = require("../purview");
const animation_1 = require("./animation");
const Help = purview_1.styledTag("p", {
    color: "red",
    ":hover": { backgroundColor: "red", color: "white" },
});
const FirstButton = purview_1.styledTag("button", {
    backgroundColor: "#ccc",
    color: "black",
});
const SecondButton = purview_1.styledTag("button", {
    backgroundColor: "blue",
    color: "white",
});
class App extends purview_1.default.Component {
    constructor() {
        super(...arguments);
        this.state = { help: false, animation: false, value: "", showFirst: false };
        this.toggleHelp = () => this.setState(state => ({ help: !state.help }));
        this.setValue = (event) => this.setState({ value: event.value });
    }
    render() {
        const help = this.state.help ? purview_1.default.createElem(Help, null, "This is some help text") : null;
        return (purview_1.default.createElem("div", null,
            purview_1.default.createElem(animation_1.default, null),
            this.state.showFirst && purview_1.default.createElem(FirstButton, null, "Bar"),
            purview_1.default.createElem(SecondButton, { onClick: () => this.setState({ showFirst: !this.state.showFirst }) }, "foo"),
            purview_1.default.createElem("br", null),
            purview_1.default.createElem("input", { type: "text" }),
            purview_1.default.createElem("input", { type: "text", value: this.state.value, onInput: this.setValue }),
            purview_1.default.createElem("br", null),
            purview_1.default.createElem("input", { type: "checkbox" }),
            purview_1.default.createElem("input", { type: "checkbox", checked: true }),
            purview_1.default.createElem("input", { type: "checkbox", checked: false }),
            purview_1.default.createElem("br", null),
            purview_1.default.createElem("input", { type: "radio", name: "foo", value: "bar" }),
            purview_1.default.createElem("input", { type: "radio", name: "foo", value: "baz" }),
            purview_1.default.createElem("br", null),
            purview_1.default.createElem("input", { type: "radio", name: "bar", value: "bar" }),
            purview_1.default.createElem("input", { type: "radio", name: "bar", value: "baz", checked: true }),
            purview_1.default.createElem("br", null),
            purview_1.default.createElem("input", { type: "radio", name: "baz", value: "bar" }),
            purview_1.default.createElem("input", { type: "radio", name: "baz", value: "baz", checked: false }),
            purview_1.default.createElem("br", null),
            purview_1.default.createElem("select", null,
                purview_1.default.createElem("option", null, "Hello"),
                purview_1.default.createElem("option", { defaultSelected: true }, "Hey"),
                purview_1.default.createElem("option", null, "Foo")),
            purview_1.default.createElem("select", null,
                purview_1.default.createElem("option", null, "Hello"),
                purview_1.default.createElem("option", null, "Hey"),
                purview_1.default.createElem("option", { selected: true }, "Foo")),
            purview_1.default.createElem("br", null),
            purview_1.default.createElem("select", { multiple: true },
                purview_1.default.createElem("option", null, "Hello"),
                purview_1.default.createElem("option", { defaultSelected: true }, "Hey"),
                purview_1.default.createElem("option", null, "Foo")),
            purview_1.default.createElem("select", { multiple: true },
                purview_1.default.createElem("option", null, "Hello"),
                purview_1.default.createElem("option", { selected: true }, "Hey"),
                purview_1.default.createElem("option", { selected: true }, "Foo")),
            purview_1.default.createElem("br", null),
            purview_1.default.createElem("textarea", { defaultValue: "foo" }),
            purview_1.default.createElem("textarea", { css: purview_1.css({ border: "2px solid black" }), value: this.state.value, onInput: this.setValue }),
            help,
            purview_1.default.createElem("button", { onClick: this.toggleHelp }, "Toggle Help")));
    }
}
exports.default = App;
//# sourceMappingURL=app.js.map