import Purview from "./purview"
import Counter from "./counter"

interface AppState {
  help: boolean
}

export default class extends Purview.Component<{}, AppState> {
  constructor(props: {}) {
    super(props)
    this.state = { help: true }
  }

  toggleHelp = () => {
    this.setState(state => ({ help: !state.help }))
  }

  render(): JSX.Element {
    let help = null
    if (this.state.help) {
      help = <p>This is some help text</p>
    }

    return (
      <div>
        <Counter initialCount={89} />
        <input type="text" />
        <input type="checkbox" />

        <input type="radio" name="foo" value="bar" />
        <input type="radio" name="foo" value="baz" />

        <select>
          <option>Hello</option>
          <option>Hey</option>
          <option>Foo</option>
        </select>

        <textarea />

        {help}
        <Counter initialCount={0} />
        <button onClick={this.toggleHelp}>Toggle Help</button>
      </div>
    )
  }
}
