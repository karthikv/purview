import * as snabbdom from "snabbdom"
import { VNode } from "snabbdom/vnode"
import toVNode from "snabbdom/tovnode"
import setAttrsMod from "snabbdom/modules/attributes"
import { isInput, isSelect, isTextArea, isOption } from "./helpers"
import { PNode } from "./types/ws"

declare global {
  interface Node {
    _vNode?: VNode
  }
}

const controlInputsMod = {
  update(_: VNode, to: VNode): void {
    const elem = to.elm
    const attrs = to.data && to.data.attrs

    if (!elem || !attrs) {
      return
    }

    if (isInput(elem) && "data-controlled" in attrs) {
      if ("value" in attrs) {
        elem.value = String(attrs.value)
      }

      // Note that the checked attribute won't be set if it was false in JSX, so
      // we need to do this even if attrs doesn't have this property.
      elem.checked = Boolean(attrs.checked)
    }

    if (isOption(elem)) {
      // Find the parent select.
      let parent = elem.parentNode
      if (parent && parent.nodeName === "OPTGROUP") {
        parent = parent.parentNode
      }

      if (
        parent &&
        isSelect(parent) &&
        parent.hasAttribute("data-controlled")
      ) {
        // Note that the selected attribute won't be set if it was false in JSX,
        // so we need to do this even if attrs doesn't have this property.
        elem.selected = Boolean(attrs.selected)
      }
    }

    if (isTextArea(elem) && "data-controlled" in attrs) {
      elem.value = (to.children![0] as VNode).text!
    }
  },
}

function trackSubtree(_: VNode, to: VNode): void {
  if (to.elm) {
    to.elm._vNode = to
  }
}

const trackSubtreeMod = {
  create: trackSubtree,
  update: trackSubtree,
}

const patch = snabbdom.init([setAttrsMod, controlInputsMod, trackSubtreeMod])

export function initMorph(node: Node): void {
  normalize(toVNode(node), true)
}

export function morph(from: Node, to: PNode): void {
  if (!from._vNode) {
    throw new Error("Can't morph: node has no associated virtual node")
  }
  if (!from._vNode.elm) {
    throw new Error("Can't morph: virtual node lacks an element")
  }
  if (from._vNode.elm !== from) {
    throw new Error("Can't morph: virtual node has invalid element")
  }

  const parentVNode = from.parentElement && from.parentElement._vNode
  let childIndex
  if (parentVNode) {
    childIndex = parentVNode.children!.findIndex(c => c === from._vNode)
    if (childIndex === -1) {
      throw new Error("Can't morph: virtual node isn't a child of parent")
    }
  }

  normalize(to as VNode, false)
  from._vNode = patch(from._vNode, to as VNode)

  if (childIndex !== undefined && childIndex > -1) {
    parentVNode!.children![childIndex] = from._vNode
  }
}

function normalize(vNode: VNode, hydrate: boolean): void {
  walk(vNode, v => {
    // During hydration, data isn't set in some cases, which causes an error
    // when morphing.
    if (hydrate && !v.data) {
      v.data = {}
    }

    // The id and classes are included in selectors by default. This means that
    // we'll create a new node if the id or classes change. We want to avoid
    // this and use the existing node so long as it has the same tag name.
    if (v.elm instanceof HTMLElement) {
      v.sel = v.elm.nodeName.toLowerCase()
      if (v.elm.hasAttribute("id")) {
        v.data!.attrs!.id = v.elm.getAttribute("id") as string
      }
      if (v.elm.hasAttribute("class")) {
        v.data!.attrs!.class = v.elm.getAttribute("class") as string
      }
    }

    if (hydrate && v.elm) {
      v.elm._vNode = v
    } else {
      delete v.elm
    }

    const attrs = v.data && v.data.attrs
    if (attrs) {
      const dataKey = attrs["data-key"]
      if (typeof dataKey === "string" || typeof dataKey === "number") {
        v.key = dataKey
      }
      if ("data-ignore-children" in attrs) {
        v.children = []
      }
    }
  })
}

function walk(vNode: VNode, callback: (v: VNode) => void): void {
  callback(vNode)
  if (vNode.children) {
    vNode.children.forEach(child => {
      if (typeof child !== "string") {
        walk(child, callback)
      }
    })
  }
}
