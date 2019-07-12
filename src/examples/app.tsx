import Purview, { ChangeEvent } from "../purview"
import Animation from "./animation"

interface AppState {
  animation: boolean
  help: boolean
  value: string
}

export default class extends Purview.Component<{}, AppState> {
  state = { help: true, animation: false, value: "" }

  toggleHelp = () => this.setState(state => ({ help: !state.help }))

  setValue = (event: ChangeEvent) =>
    this.setState({ value: event.value as string })

  render(): JSX.Element {
    const help = this.state.help ? <p>This is some help text</p> : null

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

        <Animation />

        <input type="text" />
        <input type="text" value={this.state.value} onInput={this.setValue} />
        <br />

        <input type="checkbox" />
        <input type="checkbox" checked />
        <input type="checkbox" checked={false} />
        <br />

        <input type="radio" name="foo" value="bar" />
        <input type="radio" name="foo" value="baz" />
        <br />

        <input type="radio" name="bar" value="bar" />
        <input type="radio" name="bar" value="baz" checked={true} />
        <br />

        <input type="radio" name="baz" value="bar" />
        <input type="radio" name="baz" value="baz" checked={false} />
        <br />

        <select>
          <option>Hello</option>
          <option defaultSelected>Hey</option>
          <option>Foo</option>
        </select>

        <select>
          <option>Hello</option>
          <option>Hey</option>
          <option selected>Foo</option>
        </select>
        <br />

        <select multiple>
          <option>Hello</option>
          <option defaultSelected>Hey</option>
          <option>Foo</option>
        </select>

        <select multiple>
          <option>Hello</option>
          <option selected>Hey</option>
          <option selected>Foo</option>
        </select>
        <br />

        <textarea defaultValue="foo" />
        <textarea value={this.state.value} onInput={this.setValue} />

        {help}
        <button onClick={this.toggleHelp}>Toggle Help</button>
      </div>
    )
  }
}
