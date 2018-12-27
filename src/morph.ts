import * as snabbdom from "snabbdom"
import { VNode } from "snabbdom/vnode"
import toVNode from "snabbdom/tovnode"
import setAttrsMod from "snabbdom/modules/attributes"
import { isInput, isOption, isTextArea } from "./helpers"

declare global {
  interface Node {
    _vNode: VNode
  }
}

const controlInputsMod = {
  update(_: VNode, to: VNode): void {
    const elem = to.elm
    const attrs = to.data && to.data.attrs

    if (!elem || !attrs) {
      return
    }

    if (isInput(elem) && attrs["data-controlled"] === "true") {
      // If the user explicitly specifies forceValue={undefined}, attrs.value
      // will be undefined, and we don't want to set the value.
      if (attrs.hasOwnProperty("value")) {
        elem.value = String(attrs.value)
      }

      // Note that the checked attribute won't be set if it was false in JSX, so
      // we need to do this even if attrs doesn't have this property.
      elem.checked = Boolean(attrs.checked)
    }

    if (
      isOption(elem) &&
      elem.parentElement &&
      elem.parentElement.getAttribute("data-controlled") === "true"
    ) {
      // Note that the checked attribute won't be set if it was false in JSX, so
      // we need to do this even if attrs doesn't have this property.
      elem.selected = Boolean(attrs.selected)
    }

    if (isTextArea(elem) && attrs["data-controlled"] === "true") {
      elem.value = elem.textContent || ""
    }
  },
}

function trackSubtree(_: VNode, to: VNode): void {
  const attrs = to.data && to.data.attrs
  if (attrs && attrs["data-component-id"] && to.elm) {
    to.elm._vNode = to
  }
}

const trackSubtreeMod = {
  create: trackSubtree,
  update: trackSubtree,

  destroy(vNode: VNode): void {
    if (vNode.elm && vNode.elm._vNode) {
      delete vNode.elm._vNode
    }
  },
}

const patch = snabbdom.init([setAttrsMod, controlInputsMod, trackSubtreeMod])

export function initMorph(node: Node): void {
  virtualize(node, true)
}

export function morph(from: Node, to: Node): void {
  const parentVNode = from.parentElement && from.parentElement._vNode
  let childIndex
  if (parentVNode && parentVNode.children && from._vNode) {
    childIndex = parentVNode.children.findIndex(c => c === from._vNode)
  }

  const vNode = virtualize(to, false)
  const newVNode = patch(from._vNode, vNode)

  if (childIndex && childIndex !== -1) {
    parentVNode!.children![childIndex] = newVNode
  }
}

function virtualize(node: Node, hydrate: boolean): VNode {
  const vNode = toVNode(node)
  walk(vNode, v => {
    if (hydrate && v.elm) {
      v.elm._vNode = v
    } else {
      delete v.elm
    }

    const attrs = v.data && v.data.attrs
    if (attrs) {
      if (attrs["data-key"]) {
        v.key = attrs["data-key"] as string
      }
      if (attrs["data-ignore-children"] === "true") {
        v.children = []
      }
    }
  })
  return vNode
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
