import Component, { ComponentConstructor } from "../component"
import { InputEvent, SubmitEvent, KeyEvent, ChangeEvent } from "./ws"

/* tslint:disable no-namespace */
declare global {
  interface NestedArray<T> extends Array<NestedArray<T> | T> {}

  namespace JSX {
    interface Element<T = HTMLAttributes> {
      nodeName: string | ComponentConstructor<any, any>
      attributes: T
      children: Child | NestedArray<Child>
    }
    interface ComponentElement<T = HTMLAttributes> extends Element<T> {
      nodeName: ComponentConstructor<any, any>
    }
    interface NormalElement<T = HTMLAttributes> extends Element<T> {
      nodeName: string
    }

    interface ElementClass extends Component<any, any> {}
    interface ElementAttributesProperty {
      props: {}
    }
    interface ElementChildrenAttribute {
      children: {}
    }

    // Everything below is taken from:
    // https://github.com/ionic-team/stencil/blob/master/src/declarations/jsx.ts
    interface IntrinsicElements {
      // HTML
      a: AnchorHTMLAttributes<HTMLAnchorElement>
      abbr: HTMLAttributes
      address: HTMLAttributes
      area: AreaHTMLAttributes<HTMLAreaElement>
      article: HTMLAttributes
      aside: HTMLAttributes
      audio: AudioHTMLAttributes<HTMLAudioElement>
      b: HTMLAttributes
      base: BaseHTMLAttributes<HTMLBaseElement>
      bdi: HTMLAttributes
      bdo: HTMLAttributes
      big: HTMLAttributes
      blockquote: BlockquoteHTMLAttributes<HTMLQuoteElement>
      body: HTMLAttributes<HTMLBodyElement>
      br: HTMLAttributes<HTMLBRElement>
      button: ButtonHTMLAttributes<HTMLButtonElement>
      canvas: CanvasHTMLAttributes<HTMLCanvasElement>
      caption: HTMLAttributes<HTMLTableCaptionElement>
      cite: HTMLAttributes
      code: HTMLAttributes
      col: ColHTMLAttributes<HTMLTableColElement>
      colgroup: ColgroupHTMLAttributes<HTMLTableColElement>
      data: HTMLAttributes<HTMLDataElement>
      datalist: HTMLAttributes<HTMLDataListElement>
      dd: HTMLAttributes
      del: DelHTMLAttributes<HTMLModElement>
      details: DetailsHTMLAttributes<HTMLElement>
      dfn: HTMLAttributes
      dialog: DialogHTMLAttributes<HTMLDialogElement>
      div: HTMLAttributes<HTMLDivElement>
      dl: HTMLAttributes<HTMLDListElement>
      dt: HTMLAttributes
      em: HTMLAttributes
      embed: EmbedHTMLAttributes<HTMLEmbedElement>
      fieldset: FieldsetHTMLAttributes<HTMLFieldSetElement>
      figcaption: HTMLAttributes
      figure: HTMLAttributes
      footer: HTMLAttributes
      form: FormHTMLAttributes<HTMLFormElement>
      h1: HTMLAttributes<HTMLHeadingElement>
      h2: HTMLAttributes<HTMLHeadingElement>
      h3: HTMLAttributes<HTMLHeadingElement>
      h4: HTMLAttributes<HTMLHeadingElement>
      h5: HTMLAttributes<HTMLHeadingElement>
      h6: HTMLAttributes<HTMLHeadingElement>
      head: HTMLAttributes<HTMLHeadElement>
      header: HTMLAttributes
      hgroup: HTMLAttributes
      hr: HTMLAttributes<HTMLHRElement>
      html: HTMLAttributes<HTMLHtmlElement>
      i: HTMLAttributes
      iframe: IframeHTMLAttributes<HTMLIFrameElement>
      img: ImgHTMLAttributes<HTMLImageElement>
      input:
        | CheckboxInputHTMLAttributes<HTMLInputElement>
        | NumberInputHTMLAttributes<HTMLInputElement>
        | TextInputHTMLAttributes<HTMLInputElement>
      ins: InsHTMLAttributes<HTMLModElement>
      kbd: HTMLAttributes
      keygen: KeygenHTMLAttributes<HTMLElement>
      label: LabelHTMLAttributes<HTMLLabelElement>
      legend: HTMLAttributes<HTMLLegendElement>
      li: LiHTMLAttributes<HTMLLIElement>
      link: LinkHTMLAttributes<HTMLLinkElement>
      main: HTMLAttributes
      map: MapHTMLAttributes<HTMLMapElement>
      mark: HTMLAttributes
      menu: MenuHTMLAttributes<HTMLMenuElement>
      menuitem: HTMLAttributes
      meta: MetaHTMLAttributes<HTMLMetaElement>
      meter: MeterHTMLAttributes<HTMLMeterElement>
      nav: HTMLAttributes
      noscript: HTMLAttributes
      object: ObjectHTMLAttributes<HTMLObjectElement>
      ol: OlHTMLAttributes<HTMLOListElement>
      optgroup: OptgroupHTMLAttributes<HTMLOptGroupElement>
      option: OptionHTMLAttributes<HTMLOptionElement>
      output: OutputHTMLAttributes<HTMLOutputElement>
      p: HTMLAttributes<HTMLParagraphElement>
      param: ParamHTMLAttributes<HTMLParamElement>
      picture: HTMLAttributes<HTMLPictureElement>
      pre: HTMLAttributes<HTMLPreElement>
      progress: ProgressHTMLAttributes<HTMLProgressElement>
      q: QuoteHTMLAttributes<HTMLQuoteElement>
      rp: HTMLAttributes
      rt: HTMLAttributes
      ruby: HTMLAttributes
      s: HTMLAttributes
      samp: HTMLAttributes
      script: ScriptHTMLAttributes<HTMLScriptElement>
      section: HTMLAttributes
      select:
        | MultiSelectHTMLAttributes<HTMLSelectElement>
        | SingleSelectHTMLAttributes<HTMLSelectElement>
      small: HTMLAttributes
      source: SourceHTMLAttributes<HTMLSourceElement>
      span: HTMLAttributes<HTMLSpanElement>
      strong: HTMLAttributes
      style: StyleHTMLAttributes<HTMLStyleElement>
      sub: HTMLAttributes
      summary: HTMLAttributes
      sup: HTMLAttributes
      table: TableHTMLAttributes<HTMLTableElement>
      tbody: HTMLAttributes<HTMLTableSectionElement>
      td: TdHTMLAttributes<HTMLTableDataCellElement>
      textarea: TextareaHTMLAttributes<HTMLTextAreaElement>
      tfoot: HTMLAttributes<HTMLTableSectionElement>
      th: ThHTMLAttributes<HTMLTableHeaderCellElement>
      thead: HTMLAttributes<HTMLTableSectionElement>
      time: TimeHTMLAttributes<HTMLTimeElement>
      title: HTMLAttributes<HTMLTitleElement>
      tr: HTMLAttributes<HTMLTableRowElement>
      track: TrackHTMLAttributes<HTMLTrackElement>
      u: HTMLAttributes
      ul: HTMLAttributes<HTMLUListElement>
      var: HTMLAttributes
      video: VideoHTMLAttributes<HTMLVideoElement>
      wbr: HTMLAttributes
    }

    export interface AnchorHTMLAttributes<T> extends HTMLAttributes<T> {
      download?: any
      href?: string
      hrefLang?: string
      hreflang?: string
      media?: string
      rel?: string
      target?: string
    }

    export interface AudioHTMLAttributes<T> extends MediaHTMLAttributes<T> {}

    export interface AreaHTMLAttributes<T> extends HTMLAttributes<T> {
      alt?: string
      coords?: string
      download?: any
      href?: string
      hrefLang?: string
      hreflang?: string
      media?: string
      rel?: string
      shape?: string
      target?: string
    }

    export interface BaseHTMLAttributes<T> extends HTMLAttributes<T> {
      href?: string
      target?: string
    }

    export interface BlockquoteHTMLAttributes<T> extends HTMLAttributes<T> {
      cite?: string
    }

    export interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
      autoFocus?: boolean
      disabled?: boolean
      form?: string
      formAction?: string
      formaction?: string
      formEncType?: string
      formenctype?: string
      formMethod?: string
      formmethod?: string
      formNoValidate?: boolean
      formnovalidate?: boolean
      formTarget?: string
      formtarget?: string
      name?: string
      type?: string
      value?: string | number
    }

    export interface CanvasHTMLAttributes<T> extends HTMLAttributes<T> {
      height?: number | string
      width?: number | string
    }

    export interface ColHTMLAttributes<T> extends HTMLAttributes<T> {
      span?: number
    }

    export interface ColgroupHTMLAttributes<T> extends HTMLAttributes<T> {
      span?: number
    }

    export interface DetailsHTMLAttributes<T> extends HTMLAttributes<T> {
      open?: boolean
    }

    export interface DelHTMLAttributes<T> extends HTMLAttributes<T> {
      cite?: string
      dateTime?: string
      datetime?: string
    }

    export interface DialogHTMLAttributes<T> extends HTMLAttributes<T> {
      open?: boolean
      returnValue?: string
    }

    export interface EmbedHTMLAttributes<T> extends HTMLAttributes<T> {
      height?: number | string
      src?: string
      type?: string
      width?: number | string
    }

    export interface FieldsetHTMLAttributes<T> extends HTMLAttributes<T> {
      disabled?: boolean
      form?: string
      name?: string
    }

    export interface FormHTMLAttributes<T> extends HTMLAttributes<T> {
      acceptCharset?: string
      acceptcharset?: string
      action?: string
      autoComplete?: string
      autocomplete?: string
      encType?: string
      enctype?: string
      method?: string
      name?: string
      noValidate?: boolean
      novalidate?: boolean | string
      target?: string
    }

    export interface HtmlHTMLAttributes<T> extends HTMLAttributes<T> {
      manifest?: string
    }

    export interface IframeHTMLAttributes<T> extends HTMLAttributes<T> {
      allowFullScreen?: boolean
      allowfullScreen?: string | boolean
      allowTransparency?: boolean
      allowtransparency?: string | boolean
      frameBorder?: number | string
      frameborder?: number | string
      height?: number | string
      marginHeight?: number
      marginheight?: string | number
      marginWidth?: number
      marginwidth?: string | number
      name?: string
      sandbox?: string
      scrolling?: string
      seamless?: boolean
      src?: string
      srcDoc?: string
      srcdoc?: string
      width?: number | string
    }

    export interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
      alt?: string
      decoding?: "async" | "auto" | "sync"
      height?: number | string
      sizes?: string
      src?: string
      srcSet?: string
      srcset?: string
      useMap?: string
      usemap?: string
      width?: number | string
    }

    export interface InsHTMLAttributes<T> extends HTMLAttributes<T> {
      cite?: string
      dateTime?: string
      datetime?: string
    }

    export interface CheckboxInputHTMLAttributes<T>
      extends InputHTMLAttributes<T> {
      type: "checkbox"
      onChange?: (event: ChangeEvent<boolean>) => void
      onInput?: (event: InputEvent<boolean>) => void
    }

    export interface NumberInputHTMLAttributes<T>
      extends InputHTMLAttributes<T> {
      type: "number"
      onChange?: (event: ChangeEvent<number>) => void
      onInput?: (event: InputEvent<number>) => void
    }

    export interface TextInputHTMLAttributes<T> extends InputHTMLAttributes<T> {
      type?: Exclude<InputType, "checkbox" | "number">
      onChange?: (event: ChangeEvent<string>) => void
      onInput?: (event: InputEvent<string>) => void
    }

    export type InputType =
      | "button"
      | "checkbox"
      | "color"
      | "date"
      | "datetime"
      | "datetime-local"
      | "email"
      | "file"
      | "hidden"
      | "image"
      | "month"
      | "number"
      | "password"
      | "radio"
      | "range"
      | "reset"
      | "search"
      | "submit"
      | "tel"
      | "text"
      | "time"
      | "url"
      | "week"

    export interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
      // Purview specific
      forceValue?: string | number
      forceChecked?: boolean

      // Standard HTML Attributes
      accept?: string
      alt?: string
      autoComplete?: string
      autocomplete?: string
      autoFocus?: boolean
      autofocus?: boolean | string
      capture?: string // https://www.w3.org/TR/html-media-capture/#the-capture-attribute
      checked?: boolean
      crossOrigin?: string
      crossorigin?: string
      disabled?: boolean
      form?: string
      formAction?: string
      formaction?: string
      formEncType?: string
      formenctype?: string
      formMethod?: string
      formmethod?: string
      formNoValidate?: boolean
      formnovalidate?: boolean
      formTarget?: string
      formtarget?: string
      height?: number | string
      list?: string
      max?: number | string
      maxLength?: number
      maxlength?: number | string
      min?: number | string
      minLength?: number
      minlength?: number | string
      multiple?: boolean
      name?: string
      pattern?: string
      placeholder?: string
      readOnly?: boolean
      readonly?: boolean | string
      required?: boolean
      size?: number
      src?: string
      step?: number | string
      type?: InputType
      value?: string | number
      width?: number | string
    }

    export interface KeygenHTMLAttributes<T> extends HTMLAttributes<T> {
      autoFocus?: boolean
      autofocus?: boolean | string
      challenge?: string
      disabled?: boolean
      form?: string
      keyType?: string
      keytype?: string
      keyParams?: string
      keyparams?: string
      name?: string
    }

    export interface LabelHTMLAttributes<T> extends HTMLAttributes<T> {
      form?: string
      htmlFor?: string
      htmlfor?: string
    }

    export interface LiHTMLAttributes<T> extends HTMLAttributes<T> {
      value?: string | number
    }

    export interface LinkHTMLAttributes<T> extends HTMLAttributes<T> {
      href?: string
      hrefLang?: string
      hreflang?: string
      integrity?: string
      media?: string
      rel?: string
      sizes?: string
      type?: string
    }

    export interface MapHTMLAttributes<T> extends HTMLAttributes<T> {
      name?: string
    }

    export interface MenuHTMLAttributes<T> extends HTMLAttributes<T> {
      type?: string
    }

    export interface MediaHTMLAttributes<T> extends HTMLAttributes<T> {
      autoPlay?: boolean
      autoplay?: boolean | string
      controls?: boolean
      crossOrigin?: string
      crossorigin?: string
      loop?: boolean
      mediaGroup?: string
      mediagroup?: string
      muted?: boolean
      preload?: string
      src?: string
    }

    export interface MetaHTMLAttributes<T> extends HTMLAttributes<T> {
      charSet?: string
      charset?: string
      content?: string
      httpEquiv?: string
      httpequiv?: string
      name?: string
    }

    export interface MeterHTMLAttributes<T> extends HTMLAttributes<T> {
      form?: string
      high?: number
      low?: number
      max?: number | string
      min?: number | string
      optimum?: number
      value?: string | number
    }

    export interface QuoteHTMLAttributes<T> extends HTMLAttributes<T> {
      cite?: string
    }

    export interface ObjectHTMLAttributes<T> extends HTMLAttributes<T> {
      classID?: string
      classid?: string
      data?: string
      form?: string
      height?: number | string
      name?: string
      type?: string
      useMap?: string
      usemap?: string
      width?: number | string
      wmode?: string
    }

    export interface OlHTMLAttributes<T> extends HTMLAttributes<T> {
      reversed?: boolean
      start?: number
    }

    export interface OptgroupHTMLAttributes<T> extends HTMLAttributes<T> {
      disabled?: boolean
      label?: string
    }

    export interface OptionHTMLAttributes<T> extends HTMLAttributes<T> {
      // Purview specific
      forceSelected?: boolean

      // Standard HTML attributes
      disabled?: boolean
      label?: string
      selected?: boolean
      value?: string | number
    }

    export interface OutputHTMLAttributes<T> extends HTMLAttributes<T> {
      form?: string
      htmlFor?: string
      htmlfor?: string
      name?: string
    }

    export interface ParamHTMLAttributes<T> extends HTMLAttributes<T> {
      name?: string
      value?: string | number
    }

    export interface ProgressHTMLAttributes<T> extends HTMLAttributes<T> {
      max?: number | string
      value?: string | number
    }

    export interface ScriptHTMLAttributes<T> extends HTMLAttributes<T> {
      async?: boolean
      charSet?: string
      charset?: string
      crossOrigin?: string
      crossorigin?: string
      defer?: boolean
      integrity?: string
      nonce?: string
      src?: string
      type?: string
    }

    export interface MultiSelectHTMLAttributes<T>
      extends SelectHTMLAttributes<T> {
      multiple: true
      onChange?: (event: ChangeEvent<string[]>) => void
      onInput?: (event: InputEvent<string[]>) => void
    }

    export interface SingleSelectHTMLAttributes<T>
      extends SelectHTMLAttributes<T> {
      multiple?: false
      onChange?: (event: ChangeEvent<string>) => void
      onInput?: (event: InputEvent<string>) => void
    }

    export interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {
      autoFocus?: boolean
      autoComplete?: string
      autocomplete?: string
      disabled?: boolean
      form?: string
      multiple?: boolean
      name?: string
      required?: boolean
      size?: number
    }

    export interface SourceHTMLAttributes<T> extends HTMLAttributes<T> {
      media?: string
      sizes?: string
      src?: string
      srcSet?: string
      type?: string
    }

    export interface StyleHTMLAttributes<T> extends HTMLAttributes<T> {
      media?: string
      nonce?: string
      scoped?: boolean
      type?: string
    }

    export interface TableHTMLAttributes<T> extends HTMLAttributes<T> {
      cellPadding?: number | string
      cellpadding?: number | string
      cellSpacing?: number | string
      cellspacing?: number | string
      summary?: string
    }

    export interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> {
      // Purview specific
      forceValue?: string | number

      // Standard HTML attributes
      autoFocus?: boolean
      autofocus?: boolean | string
      cols?: number
      disabled?: boolean
      form?: string
      maxLength?: number
      maxlength?: number | string
      minLength?: number
      minlength?: number | string
      name?: string
      placeholder?: string
      readOnly?: boolean
      readonly?: boolean | string
      required?: boolean
      rows?: number
      value?: string | number
      wrap?: string
    }

    export interface TdHTMLAttributes<T> extends HTMLAttributes<T> {
      colSpan?: number
      headers?: string
      rowSpan?: number
    }

    export interface ThHTMLAttributes<T> extends HTMLAttributes<T> {
      colSpan?: number
      headers?: string
      rowSpan?: number
      rowspan?: number | string
      scope?: string
    }

    export interface TimeHTMLAttributes<T> extends HTMLAttributes<T> {
      dateTime?: string
    }

    export interface TrackHTMLAttributes<T> extends HTMLAttributes<T> {
      default?: boolean
      kind?: string
      label?: string
      src?: string
      srcLang?: string
      srclang?: string
    }

    export interface VideoHTMLAttributes<T> extends MediaHTMLAttributes<T> {
      height?: number | string
      playsInline?: boolean
      playsinline?: boolean | string
      poster?: string
      width?: number | string
    }

    export type Child =
      | string
      | number
      | boolean
      | null
      | undefined
      | JSX.Element

    export interface HTMLAttributes<T = HTMLElement> extends DOMAttributes {
      // Purview specific
      key?: string | number
      children?: Child | NestedArray<Child>
      ignoreChildren?: boolean

      // Standard HTML Attributes
      accessKey?: string
      class?: string | { [className: string]: boolean }
      contentEditable?: boolean | string
      contenteditable?: boolean | string
      contextMenu?: string
      contextmenu?: string
      dir?: string
      draggable?: boolean
      hidden?: boolean
      id?: string
      lang?: string
      slot?: string
      spellCheck?: boolean
      spellcheck?: boolean | string
      style?: string
      tabIndex?: number
      tabindex?: number | string
      title?: string

      // Unknown
      inputMode?: string
      inputmode?: string
      is?: string
      radioGroup?: string // <command>, <menuitem>
      radiogroup?: string

      // WAI-ARIA
      role?: string

      // RDFa Attributes
      about?: string
      datatype?: string
      inlist?: any
      prefix?: string
      property?: string
      resource?: string
      typeof?: string
      vocab?: string

      // Non-standard Attributes
      autoCapitalize?: string
      autocapitalize?: string
      autoCorrect?: string
      autocorrect?: string
      autoSave?: string
      autosave?: string
      color?: string
      itemProp?: string
      itemprop?: string
      itemScope?: boolean
      itemscope?: boolean
      itemType?: string
      itemtype?: string
      itemID?: string
      itemid?: string
      itemRef?: string
      itemref?: string
      results?: number
      security?: string
      unselectable?: boolean
    }

    export interface SVGAttributes extends DOMAttributes {
      // Attributes which also defined in HTMLAttributes
      // See comment in SVGDOMPropertyConfig.js
      class?: string | { [className: string]: boolean }
      color?: string
      height?: number | string
      id?: string
      lang?: string
      max?: number | string
      media?: string
      method?: string
      min?: number | string
      name?: string
      style?: string
      target?: string
      type?: string
      width?: number | string

      // Other HTML properties supported by SVG elements in browsers
      role?: string
      tabIndex?: number

      // SVG Specific attributes
      accentHeight?: number | string
      accumulate?: "none" | "sum"
      additive?: "replace" | "sum"
      alignmentBaseline?:
        | "auto"
        | "baseline"
        | "before-edge"
        | "text-before-edge"
        | "middle"
        | "central"
        | "after-edge"
        | "text-after-edge"
        | "ideographic"
        | "alphabetic"
        | "hanging"
        | "mathematical"
        | "inherit"
      allowReorder?: "no" | "yes"
      alphabetic?: number | string
      amplitude?: number | string
      arabicForm?: "initial" | "medial" | "terminal" | "isolated"
      ascent?: number | string
      attributeName?: string
      attributeType?: string
      autoReverse?: number | string
      azimuth?: number | string
      baseFrequency?: number | string
      baselineShift?: number | string
      baseProfile?: number | string
      bbox?: number | string
      begin?: number | string
      bias?: number | string
      by?: number | string
      calcMode?: number | string
      capHeight?: number | string
      clip?: number | string
      clipPath?: string
      clipPathUnits?: number | string
      clipRule?: number | string
      colorInterpolation?: number | string
      colorInterpolationFilters?: "auto" | "sRGB" | "linearRGB" | "inherit"
      colorProfile?: number | string
      colorRendering?: number | string
      contentScriptType?: number | string
      contentStyleType?: number | string
      cursor?: number | string
      cx?: number | string
      cy?: number | string
      d?: string
      decelerate?: number | string
      descent?: number | string
      diffuseConstant?: number | string
      direction?: number | string
      display?: number | string
      divisor?: number | string
      dominantBaseline?: number | string
      dur?: number | string
      dx?: number | string
      dy?: number | string
      edgeMode?: number | string
      elevation?: number | string
      enableBackground?: number | string
      end?: number | string
      exponent?: number | string
      externalResourcesRequired?: number | string
      fill?: string
      fillOpacity?: number | string
      fillRule?: "nonzero" | "evenodd" | "inherit"
      filter?: string
      filterRes?: number | string
      filterUnits?: number | string
      floodColor?: number | string
      floodOpacity?: number | string
      focusable?: number | string
      fontFamily?: string
      fontSize?: number | string
      fontSizeAdjust?: number | string
      fontStretch?: number | string
      fontStyle?: number | string
      fontVariant?: number | string
      fontWeight?: number | string
      format?: number | string
      from?: number | string
      fx?: number | string
      fy?: number | string
      g1?: number | string
      g2?: number | string
      glyphName?: number | string
      glyphOrientationHorizontal?: number | string
      glyphOrientationVertical?: number | string
      glyphRef?: number | string
      gradientTransform?: string
      gradientUnits?: string
      hanging?: number | string
      horizAdvX?: number | string
      horizOriginX?: number | string
      ideographic?: number | string
      imageRendering?: number | string
      in2?: number | string
      in?: string
      intercept?: number | string
      k1?: number | string
      k2?: number | string
      k3?: number | string
      k4?: number | string
      k?: number | string
      kernelMatrix?: number | string
      kernelUnitLength?: number | string
      kerning?: number | string
      keyPoints?: number | string
      keySplines?: number | string
      keyTimes?: number | string
      lengthAdjust?: number | string
      letterSpacing?: number | string
      lightingColor?: number | string
      limitingConeAngle?: number | string
      local?: number | string
      markerEnd?: string
      markerHeight?: number | string
      markerMid?: string
      markerStart?: string
      markerUnits?: number | string
      markerWidth?: number | string
      mask?: string
      maskContentUnits?: number | string
      maskUnits?: number | string
      mathematical?: number | string
      mode?: number | string
      numOctaves?: number | string
      offset?: number | string
      opacity?: number | string
      operator?: number | string
      order?: number | string
      orient?: number | string
      orientation?: number | string
      origin?: number | string
      overflow?: number | string
      overlinePosition?: number | string
      overlineThickness?: number | string
      paintOrder?: number | string
      panose1?: number | string
      pathLength?: number | string
      patternContentUnits?: string
      patternTransform?: number | string
      patternUnits?: string
      pointerEvents?: number | string
      points?: string
      pointsAtX?: number | string
      pointsAtY?: number | string
      pointsAtZ?: number | string
      preserveAlpha?: number | string
      preserveAspectRatio?: string
      primitiveUnits?: number | string
      r?: number | string
      radius?: number | string
      refX?: number | string
      refY?: number | string
      renderingIntent?: number | string
      repeatCount?: number | string
      repeatDur?: number | string
      requiredExtensions?: number | string
      requiredFeatures?: number | string
      restart?: number | string
      result?: string
      rotate?: number | string
      rx?: number | string
      ry?: number | string
      scale?: number | string
      seed?: number | string
      shapeRendering?: number | string
      slope?: number | string
      spacing?: number | string
      specularConstant?: number | string
      specularExponent?: number | string
      speed?: number | string
      spreadMethod?: string
      startOffset?: number | string
      stdDeviation?: number | string
      stemh?: number | string
      stemv?: number | string
      stitchTiles?: number | string
      stopColor?: string
      stopOpacity?: number | string
      strikethroughPosition?: number | string
      strikethroughThickness?: number | string
      string?: number | string
      stroke?: string
      strokeDasharray?: string | number
      strokeDashoffset?: string | number
      strokeLinecap?: "butt" | "round" | "square" | "inherit"
      strokeLinejoin?: "miter" | "round" | "bevel" | "inherit"
      strokeMiterlimit?: string
      strokeOpacity?: number | string
      strokeWidth?: number | string
      surfaceScale?: number | string
      systemLanguage?: number | string
      tableValues?: number | string
      targetX?: number | string
      targetY?: number | string
      textAnchor?: string
      textDecoration?: number | string
      textLength?: number | string
      textRendering?: number | string
      to?: number | string
      transform?: string
      u1?: number | string
      u2?: number | string
      underlinePosition?: number | string
      underlineThickness?: number | string
      unicode?: number | string
      unicodeBidi?: number | string
      unicodeRange?: number | string
      unitsPerEm?: number | string
      vAlphabetic?: number | string
      values?: string
      vectorEffect?: number | string
      version?: string
      vertAdvY?: number | string
      vertOriginX?: number | string
      vertOriginY?: number | string
      vHanging?: number | string
      vIdeographic?: number | string
      viewBox?: string
      viewTarget?: number | string
      visibility?: number | string
      vMathematical?: number | string
      widths?: number | string
      wordSpacing?: number | string
      writingMode?: number | string
      x1?: number | string
      x2?: number | string
      x?: number | string
      xChannelSelector?: string
      xHeight?: number | string
      xlinkActuate?: string
      xlinkArcrole?: string
      xlinkHref?: string
      xlinkRole?: string
      xlinkShow?: string
      xlinkTitle?: string
      xlinkType?: string
      xmlBase?: string
      xmlLang?: string
      xmlns?: string
      xmlnsXlink?: string
      xmlSpace?: string
      y1?: number | string
      y2?: number | string
      y?: number | string
      yChannelSelector?: string
      z?: number | string
      zoomAndPan?: string
    }

    export interface DOMAttributes {
      // Clipboard Events
      onCopy?: () => void
      onCopyCapture?: () => void
      onCut?: () => void
      onCutCapture?: () => void
      onPaste?: () => void
      onPasteCapture?: () => void

      // Composition Events
      onCompositionEnd?: () => void
      onCompositionEndCapture?: () => void
      onCompositionStart?: () => void
      onCompositionStartCapture?: () => void
      onCompositionUpdate?: () => void
      onCompositionUpdateCapture?: () => void

      // Focus Events
      onFocus?: () => void
      onFocusCapture?: () => void
      onBlur?: () => void
      onBlurCapture?: () => void

      // Form Events
      onChange?: (event: InputEvent<any>) => void
      onChangeCapture?: (event: InputEvent<any>) => void
      onInput?: (event: InputEvent<any>) => void
      onInputCapture?: (event: InputEvent<any>) => void
      onReset?: () => void
      onResetCapture?: () => void
      onSubmit?: (event: SubmitEvent) => void
      onSubmitCapture?: (event: SubmitEvent) => void
      onInvalid?: () => void
      onInvalidCapture?: () => void

      // Image Events
      onLoad?: () => void
      onLoadCapture?: () => void
      onError?: () => void // also a Media Event
      onErrorCapture?: () => void // also a Media Event

      // Keyboard Events
      onKeyDown?: (event: KeyEvent) => void
      onKeyDownCapture?: (event: KeyEvent) => void
      onKeyPress?: (event: KeyEvent) => void
      onKeyPressCapture?: (event: KeyEvent) => void
      onKeyUp?: (event: KeyEvent) => void
      onKeyUpCapture?: (event: KeyEvent) => void

      // MouseEvents
      onAuxClick?: () => void
      onClick?: () => void
      onClickCapture?: () => void
      onContextMenu?: () => void
      onContextMenuCapture?: () => void
      onDblClick?: () => void
      onDblClickCapture?: () => void
      onDrag?: () => void
      onDragCapture?: () => void
      onDragEnd?: () => void
      onDragEndCapture?: () => void
      onDragEnter?: () => void
      onDragEnterCapture?: () => void
      onDragExit?: () => void
      onDragExitCapture?: () => void
      onDragLeave?: () => void
      onDragLeaveCapture?: () => void
      onDragOver?: () => void
      onDragOverCapture?: () => void
      onDragStart?: () => void
      onDragStartCapture?: () => void
      onDrop?: () => void
      onDropCapture?: () => void
      onMouseDown?: () => void
      onMouseDownCapture?: () => void
      onMouseEnter?: () => void
      onMouseLeave?: () => void
      onMouseMove?: () => void
      onMouseMoveCapture?: () => void
      onMouseOut?: () => void
      onMouseOutCapture?: () => void
      onMouseOver?: () => void
      onMouseOverCapture?: () => void
      onMouseUp?: () => void
      onMouseUpCapture?: () => void

      // Touch Events
      onTouchCancel?: () => void
      onTouchCancelCapture?: () => void
      onTouchEnd?: () => void
      onTouchEndCapture?: () => void
      onTouchMove?: () => void
      onTouchMoveCapture?: () => void
      onTouchStart?: () => void
      onTouchStartCapture?: () => void

      // UI Events
      onScroll?: () => void
      onScrollCapture?: () => void

      // Wheel Events
      onWheel?: () => void
      onWheelCapture?: () => void

      // Animation Events
      onAnimationStart?: () => void
      onAnimationStartCapture?: () => void
      onAnimationEnd?: () => void
      onAnimationEndCapture?: () => void
      onAnimationIteration?: () => void
      onAnimationIterationCapture?: () => void

      // Transition Events
      onTransitionEnd?: () => void
      onTransitionEndCapture?: () => void
    }
  }
}
