"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Normally you'd import from "purview". We use "../purview" here since we're in
// the Purview codebase.
const purview_1 = require("../purview");
const sequelize_1 = require("sequelize");
const http = require("http");
const express = require("express");
const db = new sequelize_1.Sequelize("sqlite:purview.db");
// (1) Write components by extending Purview.Component. The two type parameters
// are the types of the props and state, respectively.
class Counter extends purview_1.default.Component {
    constructor() {
        super(...arguments);
        this.increment = async () => {
            await db.query("UPDATE counters SET count = count + 1");
            await this.setState(await this.getInitialState());
        };
    }
    async getInitialState() {
        // Query the current count from the database.
        const rows = await db.query("SELECT count FROM counters LIMIT 1", { type: sequelize_1.QueryTypes.SELECT });
        return { count: rows[0].count };
    }
    render() {
        return (purview_1.default.createElem("div", null,
            purview_1.default.createElem("p", null,
                "The count is ",
                this.state.count),
            purview_1.default.createElem("button", { onClick: this.increment }, "Click to increment")));
    }
}
async function startServer() {
    // (2) Send down server-rendered HTML and a script tag with Purview's
    // client-side JavaScript.
    const app = express();
    app.get("/", async (req, res) => {
        res.send(`
      <body>
        ${await purview_1.default.render(purview_1.default.createElem(Counter, null), req)}
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
    // Reset database and insert our initial counter.
    db.define("counter", { count: sequelize_1.DataTypes.INTEGER }, { timestamps: false });
    await db.sync({ force: true });
    await db.query("INSERT INTO counters (count) VALUES (0)");
    /* tslint:disable no-console */
    server.listen(port, () => console.log(`Listening on localhost:${port}`));
    /* tslint:enable no-console */
}
void startServer();
//# sourceMappingURL=counter.js.map