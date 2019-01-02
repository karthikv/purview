import * as http from "http"
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
            <script src="http://localhost:8080/browser.js"></script>
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
Purview.handleWebSocket(server, {
  origin: `http://localhost:${port}`,
})

/* tslint:disable no-console */
server.listen(port, () => console.log(`Listening on localhost:${port}`))
/* tslint:enable no-console */
