"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const urlLib = require("url");
const fs = require("fs");
const pathLib = require("path");
const purview_1 = require("../purview");
const app_1 = require("./app");
const server = http.createServer(async (req, res) => {
    if (!req.url) {
        res.statusCode = 400;
        res.end();
        return;
    }
    const url = urlLib.parse(req.url);
    switch (url.pathname) {
        case "/":
            const app = await purview_1.default.render(purview_1.default.createElem(app_1.default, null), req);
            const css = await purview_1.default.renderCSS(req);
            const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            ${css}
            <script src="http://localhost:8080/browser.js"></script>
          </head>
          <body>
            <h1>This is a counter</h1>
            <div id="root">
              ${app}
            </div>
          </body>
        </html>
      `;
            res.setHeader("Content-type", "text/html");
            res.end(html);
            break;
        default:
            res.statusCode = 404;
            res.end();
            break;
    }
});
const port = 8000;
const wsServer = purview_1.default.handleWebSocket(server, {
    origin: `http://localhost:${port}`,
});
/* tslint:disable no-console */
server.listen(port, () => console.log(`Listening on localhost:${port}`));
/* tslint:enable no-console */
const TMP_DIR = pathLib.join(__dirname, "..", "..", "tmp");
purview_1.default.reloadOptions.saveStateTree = async (id, stateTree) => {
    const path = stateTreePath(id);
    await fs.promises.writeFile(path, JSON.stringify(stateTree));
    setTimeout(() => purview_1.default.reloadOptions.deleteStateTree(id), 60000);
};
purview_1.default.reloadOptions.getStateTree = async (id) => {
    const path = stateTreePath(id);
    let contents;
    try {
        contents = await fs.promises.readFile(path, "utf8");
    }
    catch (error) {
        if (error.code === "ENOENT") {
            return null;
        }
        throw error;
    }
    return JSON.parse(contents);
};
purview_1.default.reloadOptions.deleteStateTree = async (id) => {
    const path = stateTreePath(id);
    try {
        await fs.promises.unlink(path);
    }
    catch (error) {
        if (error.code === "ENOENT") {
            return;
        }
        throw error;
    }
};
function stateTreePath(id) {
    return pathLib.join(TMP_DIR, `state_tree_${id}`);
}
process.once("SIGUSR2", () => {
    wsServer.close();
    setTimeout(() => process.kill(process.pid, "SIGUSR2"), 250);
});
//# sourceMappingURL=server.js.map