import Purview from "../purview"
import * as Sequelize from "sequelize"

const db = new Sequelize("sqlite:purview.db")

export default class extends Purview.Component<{}, { count: number }> {
  async getInitialState(): Promise<{ count: number }> {
    // Query the current count from the database.
    const [rows] = await db.query("SELECT count FROM counter LIMIT 1")
    return { count: rows[0].count }
  }

  increment = async () => {
    await db.query("UPDATE counter SET count = count + 1")
    this.setState(await this.getInitialState())
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
