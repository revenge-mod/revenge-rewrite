import { ReactJSXRuntime } from '@revenge-mod/modules/common'
import { patcher } from './shared'

import type { ComponentProps, ElementType, JSXElementConstructor, ReactElement } from 'react'

const beforeCallbacks: Record<string, Set<JSXBeforeComponentCreateCallback>> = {}
const afterCallbacks: Record<string, Set<JSXAfterComponentCreateCallback>> = {}

const patchCallback = (
    args: Parameters<(typeof ReactJSXRuntime)['jsx' | 'jsxs']>,
    orig: (typeof ReactJSXRuntime)['jsx' | 'jsxs'],
) => {
    const [Comp, props] = args

    const name =
        typeof Comp === 'string'
            ? Comp
            : (Comp.name ??
              // @ts-expect-error
              (typeof Comp.type === 'string' ? Comp.type : (Comp.type as JSXElementConstructor<unknown>)?.name) ??
              Comp.displayName)

    if (!name) return orig.apply(ReactJSXRuntime, args)

    let newArgs = args
    if (name in beforeCallbacks)
        for (const cb of beforeCallbacks[name]!) {
            const maybeArgs = cb(newArgs as [ElementType, ComponentProps<ElementType>, string | undefined])
            if (maybeArgs) newArgs = maybeArgs
        }

    let tree = orig.apply(ReactJSXRuntime, newArgs)

    if (name in afterCallbacks) {
        for (const cb of afterCallbacks[name]!) {
            const maybeTree = cb(Comp, props, tree)
            if (maybeTree) tree = maybeTree
        }
    }

    return tree
}

setTimeout(() => {
    patcher.instead(ReactJSXRuntime, 'jsx', patchCallback, 'patchJsxRuntime')
    patcher.instead(ReactJSXRuntime, 'jsxs', patchCallback, 'patchJsxRuntime')
})

export const ReactJSXLibrary = {
    beforeElementCreate: beforeJSXElementCreate,
    afterElementCreate: afterJSXElementCreate,
    isNativeElement: isNativeJSXElement,
}

export type ReactJSXLibrary = typeof ReactJSXLibrary

export type JSXBeforeComponentCreateCallback<E extends ElementType = ElementType, P = ComponentProps<E>> = (
    args: [element: E, props: P, key?: string | undefined],
) => Parameters<(typeof ReactJSXRuntime)['jsx']> | undefined | void

export type JSXAfterComponentCreateCallback<E extends ElementType = ElementType, P = ComponentProps<E>> = (
    Comp: E,
    props: P,
    tree: ReactElement,
) => ReactElement | undefined | void

export function afterJSXElementCreate<E extends ElementType = ElementType, P = ComponentProps<E>>(
    elementName: string,
    callback: JSXAfterComponentCreateCallback<E, P>,
) {
    if (!(elementName in afterCallbacks)) afterCallbacks[elementName] = new Set()
    afterCallbacks[elementName]!.add(callback as JSXAfterComponentCreateCallback)
}

export function beforeJSXElementCreate<E extends ElementType = ElementType, P = ComponentProps<E>>(
    elementName: string,
    callback: JSXBeforeComponentCreateCallback<E, P>,
) {
    if (!(elementName in beforeCallbacks)) beforeCallbacks[elementName] = new Set()
    beforeCallbacks[elementName]!.add(callback as JSXBeforeComponentCreateCallback)
}

// @ts-expect-error
export function isNativeJSXElement(element: ElementType): element is string {
    return typeof element === 'string'
}
