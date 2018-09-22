import Purview from "./purview"
import Counter from "./counter"

interface AppState {
  help: boolean
}

export default class extends Purview<{}, AppState> {
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
        <Counter initialCount={0} />

        {help}
        <button onClick={this.toggleHelp}>Toggle Help</button>
      </div>
    )
  }
}
