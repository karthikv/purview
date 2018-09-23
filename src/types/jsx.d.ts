import Component, { ComponentConstructor } from "../component"

/* tslint:disable no-namespace */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      p: IntrinsicAttributes
      div: IntrinsicAttributes
      span: IntrinsicAttributes
      button: IntrinsicAttributes
      br: IntrinsicAttributes
    }

    type Child = string | number | JSX.Element | null

    interface IntrinsicAttributes {
      "data-onClick"?: string
      onClick?: () => void
      children?: Child | Child[]
    }

    interface Element {
      nodeName: string | ComponentConstructor<any, any>
      attributes: JSX.IntrinsicAttributes
      children: Child[]
    }

    interface ComponentElement extends Element {
      nodeName: ComponentConstructor<any, any>
    }

    interface ElementClass extends Component<any, any> {}

    interface ElementAttributesProperty {
      props: {}
    }

    interface ElementChildrenAttribute {
      children: {}
    }
  }
}
