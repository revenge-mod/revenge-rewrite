import { ReactJSXRuntime } from '@revenge-mod/modules/common'

import type { ComponentProps, ElementType, Key, ReactElement } from 'react'

let patched = false

const origJsx = ReactJSXRuntime.jsx
const origJsxs = ReactJSXRuntime.jsxs

const beforeCallbacks: Record<string, Set<JSXBeforeComponentCreateCallback>> = {}
const afterCallbacks: Record<string, Set<JSXAfterComponentCreateCallback>> = {}

const patchCallback =
    <T extends (typeof ReactJSXRuntime)['jsx' | 'jsxs']>(orig: T) =>
    (...args: Parameters<T>) => {
        const [Comp, props] = args
        // @ts-expect-error
        const name = Comp?.displayName ?? Comp?.type?.name ?? Comp?.type ?? Comp?.name ?? Comp
        if (typeof name !== 'string') return orig.apply(ReactJSXRuntime, args)

        let pArgs = args
        if (beforeCallbacks[name])
            for (const cb of beforeCallbacks[name]!) {
                const maybeArgs = cb(pArgs)
                if (maybeArgs) pArgs = maybeArgs as Parameters<T>
            }

        let pTree = orig.apply(ReactJSXRuntime, pArgs)

        if (afterCallbacks[name]) {
            for (const cb of afterCallbacks[name]!) {
                const maybeTree = cb(Comp, props, pTree)
                if (!(maybeTree === undefined)) pTree = maybeTree!
            }
        }

        return pTree
    }

const patchJsxRuntimeIfNotPatched = () => {
    if (patched) return
    patched = true

    ReactJSXRuntime.jsx = patchCallback(origJsx)
    ReactJSXRuntime.jsxs = patchCallback(origJsxs)
}

const unpatchIfNoListenersLeft = () => {
    if (Object.values(beforeCallbacks).some(set => set.size) || Object.values(afterCallbacks).some(set => set.size))
        return

    ReactJSXRuntime.jsx = origJsx
    ReactJSXRuntime.jsxs = origJsxs

    patched = false
}

export const ReactJSXLibrary = {
    beforeElementCreate: beforeJSXElementCreate,
    afterElementCreate: afterJSXElementCreate,
    isNativeElement: isNativeJSXElement,
}

export type ReactJSXLibrary = typeof ReactJSXLibrary

export type JSXBeforeComponentCreateCallback<
    E extends ElementType = ElementType,
    P = ComponentProps<E>,
> = (
    args: [element: E, props: P, key?: Key | undefined],
) => Parameters<(typeof ReactJSXRuntime)['jsx']> | undefined | void

export type JSXAfterComponentCreateCallback<
    E extends ElementType = ElementType,
    P = ComponentProps<E>,
> = (Comp: E, props: P, tree: ReactElement) => ReactElement | null | undefined | void

export function afterJSXElementCreate<
    E extends ElementType = ElementType<any, keyof JSX.IntrinsicElements>,
    P = ComponentProps<E>,
>(elementName: string, callback: JSXAfterComponentCreateCallback<E, P>) {
    patchJsxRuntimeIfNotPatched()

    const set = (afterCallbacks[elementName] ??= new Set())
    set.add(callback as JSXAfterComponentCreateCallback)

    return () => {
        set.delete(callback as JSXAfterComponentCreateCallback)
        if (!set.size) unpatchIfNoListenersLeft()
    }
}

export function beforeJSXElementCreate<E extends ElementType = ElementType, P = ComponentProps<E>>(
    elementName: string,
    callback: JSXBeforeComponentCreateCallback<E, P>,
) {
    patchJsxRuntimeIfNotPatched()

    const set = (beforeCallbacks[elementName] ??= new Set())
    set.add(callback as JSXBeforeComponentCreateCallback)

    return () => {
        set.delete(callback as JSXBeforeComponentCreateCallback)
        if (!set.size) unpatchIfNoListenersLeft()
    }
}

// @ts-expect-error
export function isNativeJSXElement(element: ElementType): element is string {
    return typeof element === 'string'
}
