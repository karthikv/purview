# Purview
[![Linux build status][semaphore-img]][semaphore-url]
[![Windows build status][appveyor-img]][appveyor-url]

What if your React components ran on the server-side? The server renders
components to HTML, sending it to the client. The client renders HTML and
notifies the server of DOM events.

With this architecture, your components can directly make database queries,
contact external services, etc, as they're running exclusively on the server.
There's no more REST or GraphQL; the RPC interface is abstracted away, and all
you deal with are standard components, event handlers, and lifecycle events.

```ts
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
```

## Benefits
- Make database queries, contact external services, etc. directly within your
  components, with no need for REST or GraphQL.
- Extensive type-checking: Comprehensive [JSX typings](src/types/jsx.d.ts)
  ensure that your HTML tags/attributes, event handlers, component props, etc.
  are all statically type-checked, courtesy of TypeScript.
- Server-side rendering is the default, so you get fast [time to first
  meaningful paint][paint].
- Persistent two-way WebSocket connections allow the server to trigger updates
  at any time. You can push realtime changes from your database or external
  services directly to the client with a simple call to `this.setState()`.
- Client-side DOM diffing for efficient updates.
- Your front-end and back-end are both encapsulated into reusable components.
  It's easy to see and modify the functionality of any part of your page.

## Usage
1) Write components by extending `Purview.Component`.
2) Send down (a) the server-rendered HTML of your component and (b) a script tag
pointing to Purview's client-side JS file.
  - For (a), call `Purview.render(<Component />)`, where `Component` is your root component, to get the HTML.
  - For (b), either serve the JavaScript in `Purview.scriptPath` directly (see
    example below) or, in an existing client-side codebase, `import
    "purview/dist/browser"`.
3) Handle WebSocket connections by calling `Purview.handleWebSocket(server)`,
where `server` is an `http.Server` object. If you're using Express, call
`http.createServer(app)` to a create a server from your `app` object. Then call
`server.listen()` instead of `app.listen()` to bind your server to a port.

Here's a minimal example:

```ts
import * as http from "http"
import Purview, { InputEvent } from "purview"
import * as express from "express"

// (1) Write components by extending Purview.Component. The two type parameters
// are the types of the props and state, respectively.
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

// (2) Send down server-rendered HTML and a script tag with Purview's
// client-side JavaScript.
app.get("/", (_, res) => {
  res.send(`
    <body>
      ${Purview.render(<Example />)}
      <script src="/script.js"></script>
    </body>
  `)
})
app.get("/script.js", (_, res) => res.sendFile(Purview.scriptPath))

// (3) Handle WebSocket connections.
Purview.handleWebSocket(server)
server.listen(8000, () => console.log(`Listening on 127.0.0.1:8000`))
```

## Differences from React
Purview mimics React in many ways, but differs significantly when it comes to
event handlers and controlled form inputs.

### Event handlers
Because your components run on the server-side, your event handlers are *not*
passed standard DOM event objects. Instead, Purview determines relevant
information associated with certain events and creates its own event objects.
Here's a description of the event object that Purview passes to your handler for
various event types:

- `onInput`: The event object is of type `InputEvent<T> = { value: T }`.  `T` is
  `boolean` for checkboxes, `number` for `<input type="number">`, and `string`
  for all other inputs.

- `onChange`: The event object is of type `ChangeEvent<T> = { value: T }`.  `T`
  is `boolean` for checkboxes, `number` for `<input type="number">`, `string[]`
  for `<select multiple>` and `string` for all other inputs.

- `onKeyDown`, `onKeyPress`, and `onKeyUp`: The event object is of type
  `KeyEvent = { key: string }`, where `key` is the [key that was pressed][key].

- `onSubmit`: The event object is of type `SubmitEvent = { fields: [key:
  string]: any }`. `fields` is a mapping of form field names to values. The
  types of the values are the same as described in the `onChange` event above
  for various input types.

All other event handlers are passed no arguments.

### Controlled Form Inputs
Because events require a round-trip to the server, it's not recommended to
control the value of form inputs unless you actually need each keystroke for
some purpose (e.g. real-time validation).

Purview retains the default behavior of HTML when possible. If you specify
a `value` attribute for an `input` tag, it will only act as the initial value,
just as it does with regular HTML. The user will be able to change and modify
the value as desired. By contrast, in React, the form input would be controlled,
and the user would be unable to modify the value.

If you want to control a form input, use the `forceValue` attribute. This will
forcibly update the value during each re-render. Note that this doesn't prevent
the user from changing the input; for that, simply use the [`disabled` attribute][disabled].

Purview does not let you specify a `value` attribute for `select` tags like
React does. Instead, you must use the `selected` attribute on `option` tags,
just like you would in regular HTML. In the same vein as `forceValue`, there's
a `forceSelected` attribute to forcibly updated the selected option on each
re-render.

### Other differences
In addition to the above differences, Purview also differs from React in the
following ways:

- The only supported lifecycle hooks are `componentDidMount()`,
  `componentWillReceiveProps()`, and `componentWillUnmount()`.
- Context, refs, fragments, error boundaries, portals, and hooks are
  unsupported.

## Inspiration
Phoenix Live View <https://www.youtube.com/watch?v=Z2DU0qLfPIY>

## Contributors
Karthik Viswanathan <karthik.ksv@gmail.com>

If you're interested in contributing to Purview, get in touch with me via the
email above. I'd love to have you help out and potentially join the core
development team.

## License
Purview is [MIT licensed](LICENSE).

[semaphore-img]: https://semaphoreci.com/api/v1/karthikv/purview/branches/master/badge.svg
[semaphore-url]: https://semaphoreci.com/karthikv/purview
[appveyor-img]: https://img.shields.io/appveyor/ci/karthikv/purview/master.svg?label=windows
[appveyor-url]: https://ci.appveyor.com/project/karthikv/purview
[paint]: https://developers.google.com/web/tools/lighthouse/audits/first-meaningful-paint
[key]: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
[disabled]: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#disabled
