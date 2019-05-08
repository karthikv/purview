import * as http from "http"
import Purview, { InputEvent } from "../purview"
import * as express from "express"

// (1) Write components by extending Purview.Component. The two type parameters
// are the types of the props and state, respectively.
class Example extends Purview.Component<{}, { text: string }> {
  state = { text: "" }

  handleInput = (event: InputEvent<string>) => {
    void this.setState({ text: event.value })
  }

  render(): JSX.Element {
    return (
      <div>
        <input type="text" onInput={this.handleInput} />
        <p>You typed: {this.state.text}</p>
      </div>
    )
  }
}

// (2) Send down server-rendered HTML and a script tag with Purview's
// client-side JavaScript.
const app = express()
app.get("/", async (req, res) => {
  res.send(`
    <body>
      ${await Purview.render(<Example />, req)}
      <script src="/script.js"></script>
    </body>
  `)
})
app.get("/script.js", (_, res) => res.sendFile(Purview.scriptPath))

// (3) Handle WebSocket connections.
const server = http.createServer(app)
const port = 8000
Purview.handleWebSocket(server, {
  origin: `http://localhost:${port}`,
})

/* tslint:disable no-console */
server.listen(port, () => console.log(`Listening on localhost:${port}`))
/* tslint:enable no-console */
