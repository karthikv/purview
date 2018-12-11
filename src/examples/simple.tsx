import * as http from "http"
import Purview, { InputEvent } from "../purview"
import * as express from "express"

class Example extends Purview.Component<{}, { text: string }> {
  constructor(props: {}) {
    super(props)
    this.state = { text: "" }
  }

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

const app = express()
const server = http.createServer(app)

app.get("/", (_, res) => {
  res.send(`
    <body>
      ${Purview.render(<Example />)}
      <script src="/script.js"></script>
    </body>
  `)
})

app.get("/script.js", (_, res) => res.sendFile(Purview.scriptPath))

Purview.handleWebSocket(server)
/* tslint:disable no-console */
server.listen(8000, () => console.log(`Listening on 127.0.0.1:8000`))
/* tslint:enable no-console */
