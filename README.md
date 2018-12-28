# Purview
[![Linux build status][semaphore-img]][semaphore-url]
[![Windows build status][appveyor-img]][appveyor-url]

**What if your React components ran on the server-side?** The server renders
components to HTML and sends it to the client. The client renders HTML and
notifies the server of DOM events.

With this architecture, your components can directly make database queries,
contact external services, etc, as they're running exclusively on the server.
There's no more REST or GraphQL; the client-server interface is abstracted away,
and all you deal with are standard components, event handlers, and lifecycle
events.

Below is a snippet of an example; see [full example code here](#usage).

```tsx
import Purview from "purview"
import * as Sequelize from "sequelize"

const db = new Sequelize("sqlite:purview.db")

class Counter extends Purview.Component<{}, { count: number }> {
  async getInitialState(): Promise<{ count: number }> {
    // Query the current count from the database.
    const [rows] = await db.query("SELECT count FROM counters LIMIT 1")
    return { count: rows[0].count }
  }

  increment = async () => {
    await db.query("UPDATE counters SET count = count + 1")
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
```

## Benefits
- Make database queries, contact external services, etc. directly within your
  components, with no need for REST or GraphQL.
- Extensive type-checking: Comprehensive [JSX typings](src/types/jsx.ts)
  ensure that your HTML tags/attributes, event handlers, component props, etc.
  are all statically type-checked, courtesy of TypeScript.
- Server-side rendering is the default, so you get fast [time to first
  meaningful paint][paint].
- Persistent two-way WebSocket connections allow the server to trigger updates
  at any time. You can push realtime changes from your database or external
  services directly to the client with a simple call to `this.setState()`.
- Client-side virtual DOM diffing for efficient updates.
- Your front-end and back-end are both encapsulated into reusable components.
  It's easy to see and modify the functionality of any part of your page.

## Caveats
- Every event and re-render incurs a network round-trip cost. Applications that
  require minimal latency (e.g. animations, games) are not well suited for
  Purview. That being said, many applications are primarily CRUD-based, and
  hence work well under Purview's architecture.
- Not React compatible due to the [differences listed
  below](#differences-from-react), so you can't use existing React
  components/libraries with Purview.
- You can't directly access the DOM within your components. For example, if you
  need to attach listeners to `window`, that's currently unsupported.

## Installation
1) Install with npm:
    ```bash
    $ npm install purview
    ```
1) Set your JSX transform to be `Purview.createElem`. For TypeScript, in your
tsconfig.json, you can do this like so:
    ```json
    {
      "compilerOptions": {
        "jsx": "react",
        "jsxFactory": "Purview.createElem"
      }
    }
    ```

    For other compilers/transpilers, you can use the JSX comment pragma: `/*
    @jsx Purview.createElem */`.

    You can also reference our [full tsconfig.json](tsconfig.json), which
    enables various strict TypeScript features that we'd recommend.

## Usage
1) Write components by extending `Purview.Component`.
1) Send down (a) the server-rendered HTML of your component and (b) a script tag
pointing to Purview's client-side JS file.
    - For (a), call `Purview.render(<Component />)`, where `Component` is your
      root component, to get a promise with the HTML.
    - For (b), either serve the JavaScript in `Purview.scriptPath` directly (see
      example below) or, in an existing client-side codebase, `import
      "purview/dist/browser"`.
1) Handle WebSocket connections by calling `Purview.handleWebSocket(server)`,
where `server` is an `http.Server` object. If you're using Express, call
`http.createServer(app)` to a create a server from your `app` object. Then call
`server.listen()` instead of `app.listen()` to bind your server to a port.

Below is a full working example:

```tsx
import Purview from "purview"
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

async function startServer(): Promise<void> {
  // (2) Send down server-rendered HTML and a script tag with Purview's
  // client-side JavaScript.
  const app = express()
  app.get("/", async (_, res) => {
    res.send(`
      <body>
        ${await Purview.render(<Counter />)}
        <script src="/script.js"></script>
      </body>
    `)
  })
  app.get("/script.js", (_, res) => res.sendFile(Purview.scriptPath))

  // (3) Handle WebSocket connections.
  const server = http.createServer(app)
  Purview.handleWebSocket(server)

  // Reset database and insert our initial counter.
  db.define("counter", { count: Sequelize.INTEGER }, { timestamps: false })
  await db.sync({ force: true })
  await db.query("INSERT INTO counters (count) VALUES (0)")

  server.listen(8000, () => console.log(`Listening on 127.0.0.1:8000`))
}

startServer()
```

## Differences from React
Purview mimics React in many ways, but differs significantly when it comes to
event handlers, controlled form inputs, and `getInitialState()`.

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

- `onSubmit`: The event object is of type `SubmitEvent = { fields: { [key:
  string]: any } }`. `fields` is a mapping of form field names to values. It is
  your responsibility to perform validation on `fields` for both the types and
  values, just as you would do if you were writing a server-side route handler.
  [class-validator][class-validator] is a helpful library here.
  
  When you add an `onSubmit` handler, the default action of the submit event is
  automatically prevented (i.e. via `event.preventDefault()`). This stops the
  browser from navigating to a different page.

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
the user from changing the input; for that, simply use the [`disabled`
attribute][disabled].

Purview does not let you specify a `value` attribute for `select` tags like
React does. Instead, you must use the `selected` attribute on `option` tags,
just like you would in regular HTML. In the same vein as `forceValue`, there's
a `forceSelected` attribute to forcibly update the selected option(s) on each
re-render.

### `getInitialState()`
Components can define a `getInitialState()` function that returns a promise with
the initial state of the component. This can be used to e.g. fetch information
from a database or service prior to the component rendering.

The call to `Purview.render()` returns a promise that resolves once all initial
state has been fetched and components have been rendered. This prevents the user
from seeing a flash of empty content before your components load their state.

### Other differences
In addition to the above, Purview also differs from React in the following ways:

- The only supported lifecycle methods are `componentDidMount()`,
  `componentWillReceiveProps()`, and `componentWillUnmount()`.
- Context, refs, fragments, error boundaries, portals, and hooks are
  unsupported.

## Inspiration
Phoenix Live View -- https://www.youtube.com/watch?v=Z2DU0qLfPIY

## Contributors
Karthik Viswanathan -- karthik.ksv@gmail.com

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
[class-validator]: https://github.com/typestack/class-validator
[disabled]: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#disabled
