import { SimplePseudos } from "csstype"

const PSEUDO_CLASS_MAP: Record<SimplePseudos, true> = {
  ":-khtml-any-link": true,
  ":-moz-any-link": true,
  ":-moz-focusring": true,
  ":-moz-full-screen": true,
  ":-moz-placeholder": true,
  ":-moz-read-only": true,
  ":-moz-read-write": true,
  ":-moz-ui-invalid": true,
  ":-moz-ui-valid": true,
  ":-ms-fullscreen": true,
  ":-ms-input-placeholder": true,
  ":-webkit-any-link": true,
  ":-webkit-full-screen": true,
  "::-moz-placeholder": true,
  "::-moz-progress-bar": true,
  "::-moz-range-progress": true,
  "::-moz-range-thumb": true,
  "::-moz-range-track": true,
  "::-moz-selection": true,
  "::-ms-backdrop": true,
  "::-ms-browse": true,
  "::-ms-check": true,
  "::-ms-clear": true,
  "::-ms-fill": true,
  "::-ms-fill-lower": true,
  "::-ms-fill-upper": true,
  "::-ms-input-placeholder": true,
  "::-ms-reveal": true,
  "::-ms-thumb": true,
  "::-ms-ticks-after": true,
  "::-ms-ticks-before": true,
  "::-ms-tooltip": true,
  "::-ms-track": true,
  "::-ms-value": true,
  "::-webkit-backdrop": true,
  "::-webkit-input-placeholder": true,
  "::-webkit-progress-bar": true,
  "::-webkit-progress-inner-value": true,
  "::-webkit-progress-value": true,
  "::-webkit-slider-runnable-track": true,
  "::-webkit-slider-thumb": true,
  "::after": true,
  "::backdrop": true,
  "::before": true,
  "::cue": true,
  "::cue-region": true,
  "::first-letter": true,
  "::first-line": true,
  "::grammar-error": true,
  "::marker": true,
  "::placeholder": true,
  "::selection": true,
  "::spelling-error": true,
  "::target-text": true,
  ":active": true,
  ":after": true,
  ":any-link": true,
  ":before": true,
  ":blank": true,
  ":checked": true,
  ":current": true,
  ":default": true,
  ":defined": true,
  ":disabled": true,
  ":empty": true,
  ":enabled": true,
  ":first": true,
  ":first-child": true,
  ":first-letter": true,
  ":first-line": true,
  ":first-of-type": true,
  ":focus": true,
  ":focus-visible": true,
  ":focus-within": true,
  ":fullscreen": true,
  ":future": true,
  ":hover": true,
  ":in-range": true,
  ":indeterminate": true,
  ":invalid": true,
  ":last-child": true,
  ":last-of-type": true,
  ":left": true,
  ":link": true,
  ":local-link": true,
  ":nth-col": true,
  ":nth-last-col": true,
  ":only-child": true,
  ":only-of-type": true,
  ":optional": true,
  ":out-of-range": true,
  ":past": true,
  ":paused": true,
  ":picture-in-picture": true,
  ":placeholder-shown": true,
  ":read-only": true,
  ":read-write": true,
  ":required": true,
  ":right": true,
  ":root": true,
  ":scope": true,
  ":target": true,
  ":target-within": true,
  ":user-invalid": true,
  ":user-valid": true,
  ":valid": true,
  ":visited": true,
}

export function isPseudoClass(value: string): value is SimplePseudos {
  return PSEUDO_CLASS_MAP.hasOwnProperty(value)
}
