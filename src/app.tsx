import Purview from "./purview"
import Counter from "./counter"
import Animation from "./animation"

interface AppState {
  animation: boolean
  help: boolean
}

export default class extends Purview.Component<{}, AppState> {
  constructor(props: {}) {
    super(props)
    this.state = { help: true, animation: false }
  }

  toggleHelp = () => {
    this.setState(state => ({ help: !state.help }))
  }

  toggleAnimation = () => {
    this.setState(state => ({ animation: !state.animation }))
  }

  render(): JSX.Element {
    const help = this.state.help ? <p>This is some help text</p> : null
    const animation = this.state.animation ? <Animation /> : null

    return (
      <div>
        <style>{`
          .animated-sin-wave {
            position: relative;
            height: 150px;
            width: 100%;
            overflow: hidden;
          }

          .animated-sin-wave > .bar {
            position: absolute;
            height: 100%;
            border-radius: 50%;
            max-width:10px;
          }

          .animated-sin-wave-description {
            width:100%;
            text-align:center;
            font-size:0.8em;
            color:#747678;
            padding: 2em
          }
        `}</style>

        <button onClick={this.toggleAnimation}>Toggle Animation</button>
        {animation}

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
