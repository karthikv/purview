import * as http from "http"
import * as urlLib from "url"
import * as fs from "fs"
import * as pathLib from "path"

import Purview from "../purview"
import App from "./app"

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.statusCode = 400
    res.end()
    return
  }

  const url = urlLib.parse(req.url)
  switch (url.pathname) {
    case "/":
      const app = await Purview.render(<App />, req)
      const css = await Purview.renderCSS(req)

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
      `

      res.setHeader("Content-type", "text/html")
      res.end(html)
      break

    default:
      res.statusCode = 404
      res.end()
      break
  }
})

const port = 8000
const wsServer = Purview.handleWebSocket(server, {
  origin: `http://localhost:${port}`,
})

/* tslint:disable no-console */
server.listen(port, () => console.log(`Listening on localhost:${port}`))
/* tslint:enable no-console */

const TMP_DIR = pathLib.join(__dirname, "..", "..", "tmp")
Purview.reloadOptions.saveStateTree = async (id, stateTree) => {
  const path = stateTreePath(id)
  await fs.promises.writeFile(path, JSON.stringify(stateTree))
  setTimeout(() => Purview.reloadOptions.deleteStateTree(id), 60000)
}

Purview.reloadOptions.getStateTree = async id => {
  const path = stateTreePath(id)
  let contents

  try {
    contents = await fs.promises.readFile(path, "utf8")
  } catch (error) {
    if ((error as any).code === "ENOENT") {
      return null
    }
    throw error
  }
  return JSON.parse(contents)
}

Purview.reloadOptions.deleteStateTree = async id => {
  const path = stateTreePath(id)
  try {
    await fs.promises.unlink(path)
  } catch (error) {
    if ((error as any).code === "ENOENT") {
      return
    }
    throw error
  }
}

function stateTreePath(id: string): string {
  return pathLib.join(TMP_DIR, `state_tree_${id}`)
}

process.once("SIGUSR2", () => {
  wsServer.close()
  setTimeout(() => process.kill(process.pid, "SIGUSR2"), 250)
})
