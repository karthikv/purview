// Normally you'd import from "purview". We use "../purview" here since we're in
// the Purview codebase.
import Purview from "../purview"
import * as Sequelize from "sequelize"
import * as http from "http"
import * as express from "express"

const db = new Sequelize("sqlite:purview.db")

// (1) Write components by extending Purview.Component. The two type parameters
// are the types of the props and state, respectively.
class Counter extends Purview.Component<{}, { count: number }> {
  async getInitialState(): Promise<{ count: number }> {
    // Query the current count from the database.
    const [rows] = await db.query("SELECT count FROM counters LIMIT 1")
    return { count: rows[0].count }
  }

  increment = async () => {
    await db.query("UPDATE counters SET count = count + 1")
    await this.setState(await this.getInitialState())
  }

  render(): JSX.Element {
    return (
      <div>
        <p>The count is {this.state.count}</p>
        <button onClick={this.increment}>Click to increment</button>
      </div>
    )
  }
}

async function startServer(): Promise<void> {
  // (2) Send down server-rendered HTML and a script tag with Purview's
  // client-side JavaScript.
  const app = express()
  app.get("/", async (req, res) => {
    res.send(`
      <body>
        ${await Purview.render(<Counter />, req)}
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

  // Reset database and insert our initial counter.
  db.define("counter", { count: Sequelize.INTEGER }, { timestamps: false })
  await db.sync({ force: true })
  await db.query("INSERT INTO counters (count) VALUES (0)")

  /* tslint:disable no-console */
  server.listen(port, () => console.log(`Listening on localhost:${port}`))
  /* tslint:enable no-console */
}

void startServer()
