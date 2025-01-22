import { patcherLazyModuleSymbol } from '@revenge-mod/patcher'
import { noop } from '@revenge-mod/utils/functions'
import { lazyValue } from '@revenge-mod/utils/lazy'

import { findEager, type FinderOptions, type LazyFinderOptions } from '../finders'

import { requireModule, afterSpecificModuleInitialized } from '../metro'
import { cachedModuleIdsForFilter } from '../metro/caches'

import type { FilterFunction, InferFilterFunctionReturnType, LazyModule, LazyModuleContext, Metro } from '../types'

export const lazyContextSymbol = Symbol.for('revenge.modules.lazyContext')
const lazyContexts = new WeakMap<LazyModule<any>, LazyModuleContext>()

export function subscribeModuleLazy(
    proxy: Metro.ModuleExports,
    callback: (exports: Metro.ModuleExports) => void,
    options?: FinderOptions,
) {
    const info = lazyContexts.get(proxy)
    if (!info) throw new Error('No lazy module attached to this proxy')

    const moduleId = info.moduleId()
    if (!moduleId)
        throw new Error(
            `Lazy module has no module ID attached, check if your filter matches any modules: ${info.filter?.key}`,
        )

    return afterSpecificModuleInitialized(moduleId, exports =>
        callback(info.filter ? findEager(info.filter, options) : exports),
    )
}

export function createLazyModuleById<F extends FilterFunction<any[]>>(moduleId: number, options?: LazyFinderOptions) {
    let cachedValue: Metro.ModuleExports

    const context: LazyModuleContext<Parameters<F>> = {
        moduleId: () => moduleId,
        exports(cb) {
            if (this.factory()) {
                cb(cachedValue)
                return noop
            }

            return this.subscribe(cb)
        },
        subscribe: cb => subscribeModuleLazy(proxy, cb, options),
        factory: () => {
            if (cachedValue === undefined) {
                const exports = requireModule(moduleId)
                if (exports) cachedValue = !options?.wildcard && exports.__esModule ? exports.default : exports
            }

            return cachedValue
        },
    }

    const proxy = lazyValue(context.factory as () => NonNullable<InferFilterFunctionReturnType<F>>, {
        ...options,
        exemptedEntries: {
            [lazyContextSymbol]: context,
            [patcherLazyModuleSymbol]: (cb: (exports: Metro.ModuleExports) => void) => context.exports(cb),
            ...options?.lazyOptions?.exemptedEntries,
        },
    })

    lazyContexts.set(proxy, context as LazyModuleContext<Metro.ModuleExports>)

    return proxy
}

export function createLazyModule<F extends FilterFunction<any[]>>(filter: F, options?: LazyFinderOptions) {
    const moduleIds = cachedModuleIdsForFilter(filter.key)
    let moduleId: number | undefined
    let cachedValue: Metro.ModuleExports

    const context: LazyModuleContext<Parameters<F>> = {
        filter,
        moduleId: () => moduleId,
        exports(cb) {
            for (const id of moduleIds) {
                moduleId = id

                // If the module has already been initialized
                if (modules.get(moduleId)?.isInitialized) {
                    // TODO: Invalidate cache when this happens
                    if (!cachedValue && !this.factory()) continue

                    cb(cachedValue)
                    return noop
                }

                // Note that below only works if the module is guaranteed to get required by other modules.
                // Components that we are blocking from rendering like <App /> or <AppContainer /> would not work and return undefined or never be called:

                // This means the module is not initialized yet, so we subscribe to it
                return this.subscribe(cb)
            }

            if (this.factory()) {
                cb(cachedValue)
                return noop
            }

            // If we reach this point, we have exhausted all the modules. No module was found.
            moduleId = undefined
            return noop
        },
        subscribe: cb => subscribeModuleLazy(proxy, cb, options),
        factory() {
            cachedValue ??= findEager(filter, options)
            return cachedValue
        },
    }

    const proxy = lazyValue(context.factory as () => NonNullable<InferFilterFunctionReturnType<F>>, {
        ...options?.lazyOptions,
        exemptedEntries: {
            [lazyContextSymbol]: context,
            [patcherLazyModuleSymbol]: (cb: (exports: Metro.ModuleExports) => void) => context.exports(cb),
            ...options?.lazyOptions?.exemptedEntries,
        },
    })

    lazyContexts.set(proxy, context as LazyModuleContext<Metro.ModuleExports>)

    return proxy
}
