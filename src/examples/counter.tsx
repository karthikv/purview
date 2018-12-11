import Purview from "../purview"
import * as Sequelize from "sequelize"

const db = new Sequelize("sqlite:purview.db")

export default class extends Purview.Component<{}, { count: number }> {
  constructor(props: {}) {
    super(props)
    this.state = { count: 0 }
    this.loadCount()
  }

  async loadCount(): Promise<void> {
    // Query the current count from the database.
    const [rows] = await db.query("SELECT count FROM counter LIMIT 1")
    this.setState({ count: rows[0].count })
  }

  increment = async () => {
    await db.query("UPDATE counter SET count = count + 1")
    await this.loadCount()
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
