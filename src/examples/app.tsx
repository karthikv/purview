import Purview from "../purview"
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

        <Counter />
        <input type="text" />
        <input type="text" forceValue="value" />
        <br />

        <input type="checkbox" />
        <input type="checkbox" forceChecked />
        <input type="checkbox" forceChecked={false} />
        <br />

        <input type="radio" name="foo" value="bar" />
        <input type="radio" name="foo" value="baz" />
        <br />

        <input type="radio" name="bar" value="bar" />
        <input type="radio" name="bar" value="baz" forceChecked={true} />
        <br />

        <input type="radio" name="baz" value="bar" />
        <input type="radio" name="baz" value="baz" forceChecked={false} />
        <br />

        <select>
          <option>Hello</option>
          <option selected>Hey</option>
          <option>Foo</option>
        </select>

        <select>
          <option>Hello</option>
          <option>Hey</option>
          <option forceSelected>Foo</option>
        </select>
        <br />

        <select multiple>
          <option>Hello</option>
          <option selected>Hey</option>
          <option>Foo</option>
        </select>

        <select multiple>
          <option>Hello</option>
          <option forceSelected>Hey</option>
          <option forceSelected>Foo</option>
        </select>
        <br />

        <textarea value="foo" />
        <textarea forceValue="foo" />

        {help}
        <button onClick={this.toggleHelp}>Toggle Help</button>
      </div>
    )
  }
}
