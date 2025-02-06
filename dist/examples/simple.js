"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const purview_1 = require("../purview");
const express = require("express");
// (1) Write components by extending Purview.Component. The two type parameters
// are the types of the props and state, respectively.
class Example extends purview_1.default.Component {
    constructor() {
        super(...arguments);
        this.state = { text: "" };
        this.handleInput = (event) => {
            void this.setState({ text: event.value });
        };
    }
    render() {
        return (purview_1.default.createElem("div", null,
            purview_1.default.createElem("input", { type: "text", onInput: this.handleInput }),
            purview_1.default.createElem("p", null,
                "You typed: ",
                this.state.text)));
    }
}
// (2) Send down server-rendered HTML and a script tag with Purview's
// client-side JavaScript.
const app = express();
app.get("/", async (req, res) => {
    res.send(`
    <body>
      ${await purview_1.default.render(purview_1.default.createElem(Example, null), req)}
      <script src="/script.js"></script>
    </body>
  `);
});
app.get("/script.js", (_, res) => res.sendFile(purview_1.default.scriptPath));
// (3) Handle WebSocket connections.
const server = http.createServer(app);
const port = 8000;
purview_1.default.handleWebSocket(server, {
    origin: `http://localhost:${port}`,
});
/* tslint:disable no-console */
server.listen(port, () => console.log(`Listening on localhost:${port}`));
/* tslint:enable no-console */
//# sourceMappingURL=simple.js.map