import * as http from "http"
import Purview, { InputEvent } from "../purview"
import * as express from "express"

// (1) Write components by extending Purview.Component. The two type parameters
// are the types of the props and state, respectively.
class Example extends Purview.Component<{}, { text: string }> {
  state = { text: "" }

  handleInput = (event: InputEvent<string>) => {
    this.setState({ text: event.value })
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
app.get("/", async (_, res) => {
  res.send(`
    <body>
      ${await Purview.render(<Example />)}
      <script src="/script.js"></script>
    </body>
  `)
})
app.get("/script.js", (_, res) => res.sendFile(Purview.scriptPath))

// (3) Handle WebSocket connections.
const server = http.createServer(app)
Purview.handleWebSocket(server)
/* tslint:disable no-console */
server.listen(8000, () => console.log(`Listening on 127.0.0.1:8000`))
/* tslint:enable no-console */
