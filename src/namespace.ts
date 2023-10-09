import {
  createElem as createElemInternal,
  handleWebSocket as handleWebSocketInternal,
  render as renderInternal,
  renderCSS as renderCSSInternal,
  Component as ComponentInternal,
  scriptPath as scriptPathInternal,
  reloadOptions as reloadOptionsInternal,
  JSX as JSXInternal,
} from "./purview"

export namespace Purview {
  export let createElem = createElemInternal
  export let handleWebSocket = handleWebSocketInternal
  export let render = renderInternal
  export let renderCSS = renderCSSInternal
  export let Component = ComponentInternal
  export let scriptPath = scriptPathInternal
  export let reloadOptions = reloadOptionsInternal
  export import JSX = JSXInternal
}
