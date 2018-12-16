import * as http from "http"
import * as fs from "fs"
import * as streamLib from "stream"
import * as urlLib from "url"

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
      const html = `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8" /></head>
          <body>
            <h1>This is a counter</h1>
            <div id="root">
              ${await Purview.render(<App />)}
            </div>
            <script src="/script.js"></script>
          </body>
        </html>
      `

      res.setHeader("Content-type", "text/html")
      res.end(html)
      break

    case `/script.js`:
      const readStream = fs.createReadStream(Purview.scriptPath)
      res.setHeader("Content-type", "application/javascript")
      streamLib.pipeline(readStream, res)
      break

    default:
      res.statusCode = 404
      res.end()
      break
  }
})

Purview.handleWebSocket(server)

const port = 8000
const host = "127.0.0.1"

/* tslint:disable no-console */
server.listen(port, host, () => console.log(`Listening on ${host}:${port}`))
/* tslint:enable no-console */
