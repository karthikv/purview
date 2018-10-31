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
      input: IntrinsicAttributes & {
        type?: string
        name?: string
        value?: string
        forceValue?: string
        checked?: boolean
        forceChecked?: boolean
      }
      select: IntrinsicAttributes & {
        autocomplete?: string
        multiple?: boolean
      }
      option: OptionAttributes
      textarea: IntrinsicAttributes & { value?: string; forceValue?: string }
      style: IntrinsicAttributes
      img: IntrinsicAttributes & { src?: string }
    }

    interface OptionAttributes extends IntrinsicAttributes {
      selected?: boolean
      forceSelected?: boolean
    }

    type Child = string | number | JSX.Element | null

    interface IntrinsicAttributes {
      "data-onClick"?: string
      onClick?: () => void
      children?: Child | Child[]
      class?: string
      style?: string
    }

    interface NestedArray<T> extends Array<NestedArray<T> | T> {}

    interface Element<T = IntrinsicAttributes> {
      nodeName: string | ComponentConstructor<any, any>
      attributes: T
      children: NestedArray<Child>
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
