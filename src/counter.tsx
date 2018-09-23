import Purview from "./purview"

interface CounterProps {
  initialCount: number
}

interface CounterState {
  count: number
}

export default class extends Purview.Component<CounterProps, CounterState> {
  constructor(props: CounterProps) {
    super(props)
    this.state = { count: this.props.initialCount }
  }

  increment = (): void => {
    this.setState(state => ({ count: state.count + 1 }))
  }

  render(): JSX.Element {
    return (
      <div>
        <span>The count is {this.state.count}</span>
        <br />
        <button onClick={this.increment}>Click to increment</button>
      </div>
    )
  }
}
