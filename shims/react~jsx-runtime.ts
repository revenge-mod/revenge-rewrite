import '@revenge-mod/modules'

import { findByProps } from '@revenge-mod/modules/finders'
import { getProxyFactory } from '@revenge-mod/utils/lazy'

const jsxRuntime = findByProps.lazy('jsx', 'jsxs', 'Fragment')

function unproxyFirstArg<T>(args: T[]) {
    if (!args[0]) {
        throw new Error('The passed component is falsy. Ensure that you are passing a valid component.')
    }

    const factory = getProxyFactory(args[0])
    if (factory) args[0] = factory()
    return args
}

export const Fragment = Symbol.for('react.fragment')
export const jsx = (...args: unknown[]) => jsxRuntime.jsx(...unproxyFirstArg(args))
export const jsxs = (...args: unknown[]) => jsxRuntime.jsxs(...unproxyFirstArg(args))
