import '@revenge-mod/modules'

import { getProxyFactory } from '@revenge-mod/utils/lazy'
// TODO: Fix this path
import { findByProps } from 'libraries/modules/src/finders'

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
export const jsx = (...args: any[]) => jsxRuntime.jsx(...unproxyFirstArg(args))
export const jsxs = (...args: any[]) => jsxRuntime.jsxs(...unproxyFirstArg(args))
