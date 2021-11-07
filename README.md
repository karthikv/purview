# Purview
[![Linux build status][semaphore-img]][semaphore-url]
[![Windows build status][appveyor-img]][appveyor-url]

**What if your React components ran on the server-side?** The server renders
components to HTML and sends it to the client. The client renders HTML and
notifies the server of DOM events. The server executes event handlers and
lifecycle events, and it maintains the state of each component.

With this architecture, your components can directly make database queries,
contact external services, etc, as they're running exclusively on the server.
There's no more REST or GraphQL; the client-server interface is abstracted away,
and all you deal with are standard components, event handlers, and lifecycle
events.

Below is a snippet of an example; see [full example code here](#usage).

```tsx
import Purview, { css } from "purview"
import { Sequelize, QueryTypes } from "sequelize"

const db = new Sequelize("sqlite:purview.db")

class Counter extends Purview.Component<{}, { count: number }> {
  async getInitialState(): Promise<{ count: number }> {
    // Query the current count from the database.
    const rows = await db.query<{ count: number }>(
      "SELECT count FROM counters LIMIT 1",
      { type: QueryTypes.SELECT },
    )
    return { count: rows[0].count }
  }

  increment = async () => {
    await db.query("UPDATE counters SET count = count + 1")
    await this.setState(await this.getInitialState())
  }

  render(): JSX.Element {
    return (
      // Atomic CSS-in-JS support is built-in.
      <div css={css({ border: "1px solid #333", padding: "10px" })}>
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
pointing to Purview's client-side JS file. If you'd like to enable Purview's
[CSS-in-JS support](#atomic-css-in-js-support), also send (c) the server-rendered CSS (a style tag) in the head of your document.
    - For (a), call `Purview.render(<Component />, req)`, where `Component` is
      your root component, and `req` is the standard request object, of type
      `http.IncomingMessage`, from express or `http.createServer`. This returns
      a promise with HTML.
    - For (b), either serve the JavaScript in `Purview.scriptPath` directly (see
      example below) or, in an existing client-side codebase, `import
      "purview/dist/browser"`.
    - For (c), call `Purview.renderCSS(req)`, where `req` is the standard
      request object, of type `http.IncomingMessage`, from express or
      `http.createServer`. This returns a promise with HTML containing a style
      tag that should be inserted in the head of the document. Make sure to call
      this after `Purview.render()` in step (a), as the CSS depends on the
      components that are being rendered.
1) Handle WebSocket connections by calling `Purview.handleWebSocket(server,
options)`, where `server` is an `http.Server` object. If you're using Express,
call `http.createServer(app)` to a create a server from your `app` object. Then
call `server.listen()` instead of `app.listen()` to bind your server to a port.
    - `options` should be an object with one key: `origin`, whose value is
      a string.
    - `origin` should be the protocol and hostname (along with the port if it's
      non-standard) of the server (e.g. `https://example.com`). This is used to
      perform WebSocket origin validation, ensuring requests originate from your
      server. You can set `origin` to `null` to skip origin validation, but this
      is not recommended.
    - Note that, if you incorrectly specify `origin`, the page will keep
      refreshing in an attempt to re-connect the WebSocket.

Below is a full working example:

```tsx
import Purview, { css } from "purview"
import { Sequelize, QueryTypes, DataTypes } from "sequelize"
import * as http from "http"
import * as express from "express"

const db = new Sequelize("sqlite:purview.db")

// (1) Write components by extending Purview.Component. The two type parameters
// are the types of the props and state, respectively.
class Counter extends Purview.Component<{}, { count: number }> {
  async getInitialState(): Promise<{ count: number }> {
    // Query the current count from the database.
    const rows = await db.query<{ count: number }>(
      "SELECT count FROM counters LIMIT 1",
      { type: QueryTypes.SELECT },
    )
    return { count: rows[0].count }
  }

  increment = async () => {
    await db.query("UPDATE counters SET count = count + 1")
    await this.setState(await this.getInitialState())
  }

  render(): JSX.Element {
    return (
      // Atomic CSS-in-JS support is built-in.
      <div css={css({ border: "1px solid #333", padding: "10px" })}>
        <p>The count is {this.state.count}</p>
        <button onClick={this.increment}>Click to increment</button>
      </div>
    )
  }
}

async function startServer(): Promise<void> {
  // (2) Send down server-rendered HTML and CSS alongside a script tag with
  // Purview's client-side JavaScript.
  const app = express()
  app.get("/", async (req, res) => {
    const counterHTML = await Purview.render(<Counter />, req)
    // Make sure to call Purview.renderCSS() after Purview.render(), as the CSS
    // is determined by the components rendered on the page.
    const styleHTML = await Purview.renderCSS(req)
    res.send(`
      <html>
        <head>
          ${styleHTML}
        </head>
        <body>
          ${counterHTML}
          <script src="/script.js"></script>
        </body>
      </html>
    `)
  })
  app.get("/script.js", (_, res) => res.sendFile(Purview.scriptPath))

  // (3) Handle WebSocket connections.
  const server = http.createServer(app)
  const port = 8000
  Purview.handleWebSocket(server, {
    origin: `http://localhost:${port}`,
  })

  // Reset database and insert our initial counter.
  db.define("counter", { count: DataTypes.INTEGER }, { timestamps: false })
  await db.sync({ force: true })
  await db.query("INSERT INTO counters (count) VALUES (0)")

  server.listen(port, () => console.log(`Listening on localhost:${port}`))
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

- `onInput`: The event object is of type `InputEvent<T> = { name: string, value:
  T }`, where `name` is the name of the input and `value` is its value. `T` is
  `boolean` for checkboxes, `number` for `<input type="number">`, and `string`
  for all other inputs.

- `onChange`: The event object is of type `ChangeEvent<T> = { name: string,
  value: T }`, where `name` is the name of the input and `value` is its value.
  `T` is `boolean` for checkboxes, `number` for `<input type="number">`,
  `string[]` for `<select multiple>` and `string` for all other inputs.

- `onKeyDown`, `onKeyPress`, and `onKeyUp`: The event object is of type
  `KeyEvent = { name: string, key: string }`, where `name` is the name of the
  input and `key` is the [key that was pressed][key].

- `onSubmit`: The event object is of type `SubmitEvent = { fields:
  Record<string, unknown> }`. `fields` is a mapping of form field names to
  values. It is your responsibility to perform validation on `fields` for both
  the types and values, just as you would do if you were writing a server-side
  route handler.

  When you add an `onSubmit` handler, the default action of the submit event is
  automatically prevented (i.e. via `event.preventDefault()`). This stops the
  browser from navigating to a different page.

All other event handlers are passed no arguments.

### Controlled Form Inputs
If you specify a `value` attribute on a text `input` or `textarea`, a `checked`
attribute on a radio/checkbox `input`, or a `selected` attribute on an `option`,
the form input will be controlled. Upon each re-render, the value will be
forcibly set to the value you specify.

Unlike React, a controlled form input's value *can* be modified, but it'll be
reset to the specified value when re-rendered. To prevent modification, use the
standard [`readonly`][readonly] or [`disabled`][disabled] HTML attributes.

Purview does not let you specify a `value` attribute for `select` tags like
React does. Instead, you must use the `selected` attribute on `option` tags,
just like you would in regular HTML. Purview controls the `select` given at
least one option has a `selected` attribute.

If you want to set an initial, uncontrolled value, use the attribute
`defaultValue` for text `input`s and `textarea`s, `defaultChecked` for
radio/checkbox `input`s, and `defaultSelected` for `option`s.

Do note that events require a round-trip to the server, so controlling form
inputs is more expensive than in React. That being said, it's quite fast given
a reasonable Internet connection, and this expense can often be ignored.

### `getInitialState()`
Components can define a `getInitialState()` function that returns a promise with
the initial state of the component. This can be used to e.g. fetch information
from a database or service prior to the component rendering.

The call to `Purview.render()` returns a promise that resolves once all initial
state has been fetched and components have been rendered. This prevents the user
from seeing a flash of empty content before your components load their state.

Do not assign/modify instance variables on your components within
`getInitialState()`. On page load, when the WebSocket connection is established,
Purview will re-initialize all components with their saved state from the last
render, and it won't call `getInitialState()`. Hence, any instance variables you
assign/modify within this function may not be reflected.

### Other differences
In addition to the above, Purview also differs from React in the following ways:

- The only supported lifecycle methods are `componentDidMount()`,
  `componentWillReceiveProps()`, and `componentWillUnmount()`.
- Context, refs, fragments, error boundaries, portals, and hooks are
  unsupported.

## Atomic CSS-in-JS support
Purview comes with built-in atomic CSS-in-JS support. To enable CSS-in-JS, make sure to send the rendered CSS to the client per [step 2 of the usage instructions](#usage).

To use CSS-in-JS, first call Purview's `css` function to generate a set of CSS
properties. Note that the object passed to the `css` function is typchecked
thanks to [CSSType](https://github.com/frenic/csstype), and it expects
camelCased keys representing CSS properties. Then, pass the return value to the
`css={...}` attribute of any standard JSX element.

```ts
const buttonCSS = css({
  padding: "6px 8px",
  fontSize: "1.4rem",
  backgroundColor: "#ccc",
})

class Button extends Purview.Component<{}, {}> {
  render(): JSX.Element {
    return <button css={buttonCSS}>Button</button>
  }
}
```

Note that you can compose CSS rules by passing multiple objects to the `css` function:

```ts
const blueCSS = css({ backgroundColor: "blue" })
// Combines all styles in buttonCSS and in blueCSS, returning a new object
// representing the joint properties. If there are conflicts, styles in blueCSS
// will take precedence over styles in buttonCSS.
const blueButtonCSS = css(buttonCSS, blueCSS)

class BlueButton extends Purview.Component<{}, {}> {
  render(): JSX.Element {
    return <button css={blueButtonCSS}>Blue Button</button>
  }
}
```

Styles do not need to be static--you can generate and change them dynamically
(even based on props/state, but be careful about user input), and Purview will
update the DOM appropriately. Purview checks that all CSS rules are valid and
will let you know if there are issues.

When Purview renders the button in the example above, the markup will look
like the following:

```html
<!-- in the head -->
<style>
  .p-a { padding-top: 6px }
  .p-b { padding-right: 8px }
  .p-c { padding-bottom: 6px }
  .p-d { padding-left: 8px }
  .p-e { font-size: 1.4rem }
  .p-f { background-color: blue }
</style>

<!-- in the body -->
<button class="p-a p-b p-c p-d p-e p-f">Blue Button</button>
```

In the markup above, notice how `blueButtonCSS` has been split up into multiple CSS classes, each of which
has one declaration. This is called atomic CSS-in-JS, and it's [described in detail by
Sébastian Lorber](https://sebastienlorber.com/atomic-css-in-js).

In short, atomic CSS-in-JS solves the following problems (among others, all
identified by Christopher Chedeau in [his
talk](https://speakerdeck.com/vjeux/react-css-in-js)):

- **Global namespace**: CSS has one global namespace. If two selectors happen to
  use the same class, tag, or ID, the rules could unintentionally affect one
  another. Purview's atomic CSS-in-JS is locally scoped because it generates
  unique class names for each unique property.
- **Dead code elimination**: It's hard to identify CSS selectors that are no
  longer used without auditing a website in full. With atomic CSS-in-JS, we get
  dead code elimination for free: TypeScript and ESLint/TSLint can identify
  unused variables, and only the CSS that is included in a rendered component
  via the `css={...}` attribute is actually sent to the client.
- **Non-deterministic resolution**: If an element has two different classes that
  define conflicting CSS properties, the properties that take precedence are
  based on the specifity of the CSS selectors, or if the specifity is the same,
  the ordering of the selectors in the stylesheet. This leads to unexpected
  behavior. Atomic CSS-in-JS has deterministic resolution--the last property
  passed to the `css` function is the one that takes precedence, as in the
  `BlueButton` example above.
- **Minification**: With classic CSS, each new component requires new CSS rules
  to be written, so CSS grows linearly. With Atomic CSS-in-JS, if an individual
  rule has been used in the past by any component, it is reused thanks to the
  single-purpose classes. This allows CSS to grow much more slowly; large sites
  like Facebook have experienced significant savings per Sébastian's article
  linked above (413KB before to 74KB after).

Note that traditional CSS-in-JS frameworks, like [Styled
Components](https://github.com/styled-components/styled-components) and
[Emotion](https://github.com/emotion-js/emotion), don't work with Purview, since
Purview components do not run in the browser.

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
[readonly]: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#readonly
