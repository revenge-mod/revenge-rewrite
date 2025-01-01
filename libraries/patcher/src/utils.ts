import { patcherLazyModuleSymbol } from '.'
import type { AwaitedWrappable, OnceModuleLoadedCallback, Wrappable, WrappableName } from './types'

type CallableFunction = (...args: any[]) => any

export function createExtendedPatchFunction<N extends WrappableName>(fn: CallableFunction) {
    function patchFn(this: any, ...args: any) {
        if (patcherLazyModuleSymbol in args[0]) {
            const onceModuleLoaded = args[0][patcherLazyModuleSymbol] as OnceModuleLoadedCallback

            let cancel = false
            let unpatch = () => (cancel = true)

            onceModuleLoaded(target => {
                if (cancel) return
                args[0] = target
                unpatch = fn.apply(this, args)
            })

            return unpatch
        }

        return fn.apply(this, args)
    }

    function promisePatchFn(this: any, ...args: [Promise<any>, ...any[]]) {
        const thenable = args[0]
        if (!thenable || !('then' in thenable)) throw new Error('Cannot await a non-thenable object')

        let cancel = false
        let unpatch = () => (cancel = true)

        thenable.then(target => {
            if (cancel) return
            args[0] = target
            unpatch = patchFn.apply(this, args)
        })

        return unpatch
    }

    return Object.assign(patchFn, { await: promisePatchFn }) as unknown as Wrappable<N> & {
        await: AwaitedWrappable<N>
    }
}

export function trapFunctionCallsRecursive<F extends CallableFunction>(
    func: F,
    onBeforeCall: (args: unknown[]) => any[],
    onReturn: (ret: ReturnType<F>) => void,
) {
    return new Proxy(func, {
        apply(target, thisArg, args) {
            const ret = target.apply(thisArg, onBeforeCall(args))
            return onReturn(ret)
        },
        get(target, prop) {
            const maybeFunc = Reflect.get(target, prop)
            if (typeof maybeFunc !== 'function') return maybeFunc

            return trapFunctionCallsRecursive<CallableFunction>(maybeFunc as CallableFunction, onBeforeCall, onReturn)
        },
    })
}
