import Purview, { PurviewCtor } from "../purview"

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
      nodeName: string | PurviewCtor<any, any>
      attributes: JSX.IntrinsicAttributes
      children: Child[]
    }

    interface ElementClass extends Purview<any, any> {}

    interface ElementAttributesProperty {
      props: {}
    }

    interface ElementChildrenAttribute {
      children: {}
    }
  }
}
