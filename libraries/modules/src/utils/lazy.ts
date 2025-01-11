import { patcherLazyModuleSymbol } from '@revenge-mod/patcher'
import { noop } from '@revenge-mod/utils/functions'
import { lazyValue } from '@revenge-mod/utils/lazy'
import { find } from '../finders'
import { subscribeModule } from '../metro'
import { cache, indexedModuleIdsForLookup } from '../metro/caches'

import type { FilterFn, LazyModuleContext, Metro } from '../types'

export const lazyContextSymbol = Symbol.for('revenge.modules.lazyContext')
const lazyContexts = new WeakMap<Metro.ModuleExports, LazyModuleContext>()

export function subscribeModuleLazy(proxy: Metro.ModuleExports, callback: (exports: Metro.ModuleExports) => void) {
    const info = getLazyContext(proxy)
    if (!info) throw new Error('No lazy module attached to this proxy')

    const moduleId = info?.getModuleId()
    if (!moduleId)
        throw new Error(
            `Lazy module has no module ID attached, check if your filter matches any modules: ${info.filter.key}`,
        )

    return subscribeModule(moduleId, () => callback(find.eager(info.filter)))
}

function getLazyContext<A extends unknown[]>(proxy: Metro.ModuleExports): LazyModuleContext<A> | undefined {
    return lazyContexts.get(proxy) as LazyModuleContext<A> | undefined
}

export function createLazyModule<A extends unknown[]>(filter: FilterFn<A>) {
    const moduleIds = indexedModuleIdsForLookup(filter.key)
    let moduleId: number | undefined
    let cachedValue: Metro.ModuleExports

    const context: LazyModuleContext<A> = {
        filter,
        getModuleId: () => moduleId,
        getExports(cb) {
            for (const id of moduleIds) {
                moduleId = id

                // If the module hasn't been indexed, or it has already been initialized (indexed is inferred)
                if (modules.get(moduleId)?.isInitialized) {
                    if (!cachedValue && !this.forceLoad()) {
                        // This module apparently doesn't exist, so we remove it from the cache
                        delete cache.lookupFlags[filter.key]?.[moduleId]
                        continue
                    }

                    cb(cachedValue)
                    return noop
                }

                // Note that below only works if the module is guaranteed to get required by other modules.
                // Components that we are blocking from rendering like <App /> or <AppContainer /> would not work and return undefined or never be called:

                // This means the module is not initialized yet, so we subscribe to it
                return this.subscribe(cb)
            }

            if (cachedValue || this.forceLoad()) {
                cb(cachedValue)
                return noop
            }

            // If we reach this point, we have exhausted all the modules. No module was found.
            moduleId = undefined
            return noop
        },
        subscribe(cb) {
            return subscribeModuleLazy(proxy, cb)
        },
        get cache() {
            return cachedValue
        },
        forceLoad() {
            cachedValue ??= find.eager(filter)
            return cachedValue
        },
    }

    const proxy = lazyValue(() => context.forceLoad(), {
        exemptedEntries: {
            [lazyContextSymbol]: context,
            [patcherLazyModuleSymbol]: (cb: (exports: Metro.ModuleExports) => void) => context.getExports(cb),
        },
    })

    lazyContexts.set(proxy, context as LazyModuleContext<Metro.ModuleExports>)

    return proxy
}
