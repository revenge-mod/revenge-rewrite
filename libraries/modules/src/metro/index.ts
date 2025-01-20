import {
    cache,
    cacheModuleAsBlacklisted,
    cachedModuleIdsForFilter,
    requireAssetModules,
    restoreCache,
    saveCache,
} from './caches'

import { IndexMetroModuleId, MetroModuleFlags, MetroModuleLookupRegistryFlags } from '../constants'

import { logger } from '../shared'

import type { Metro } from '../types'

let importingModuleId = -1

/**
 * Gets the module ID that is currently being imported, `-1` if none
 */
export function getImportingModuleId() {
    return importingModuleId
}

export type SpecificMetroModuleSubscriptionCallback = (exports: Metro.ModuleExports) => unknown
export type MetroModuleSubscriptionCallback = (id: Metro.ModuleID, exports: Metro.ModuleExports) => unknown

const allSubscriptionsSet = new Set<MetroModuleSubscriptionCallback>()
const subscriptions: Map<Metro.ModuleID, Set<SpecificMetroModuleSubscriptionCallback>> = new Map()

function handleModuleInitializeError(id: Metro.ModuleID, error: unknown) {
    logger.error(`Blacklisting module ${id} because it could not be imported: ${error}`)
    blacklistModule(id)
}

/**
 * Initializes the Metro modules patches and caches
 */
export async function initializeModules() {
    const cacheRestoredPromise = restoreCache()

    // Patches modules on load
    import('./patches')

    function executeModuleSubscriptions(this: Metro.ModuleDefinition) {
        const id = this.publicModule.id
        const exports = this.publicModule.exports

        const subs = subscriptions.get(id)
        if (subs) for (const sub of subs) sub(exports)
        for (const sub of allSubscriptionsSet) sub(id, exports)
    }

    for (const [id, module] of modules.entries()) {
        if (!moduleShouldNotBeHooked(id)) {
            // Allow patching already initialized modules
            // These are critical modules like React, React Native, some polyfills, and native modules
            if (module.isInitialized) {
                if (isModuleExportsBad(module.publicModule.exports)) blacklistModule(id)
                else {
                    logger.warn(`Hooking already initialized module: ${id}`)
                    executeModuleSubscriptions.call(module)
                }
                continue
            }

            const origFac = module.factory!
            ;(module as Metro.ModuleDefinition<false>).factory = (...args: Parameters<Metro.FactoryFn>) => {
                const originalImportingId = importingModuleId
                importingModuleId = id

                try {
                    origFac(...args)
                    if (isModuleExportsBad(module.publicModule.exports)) return blacklistModule(id)
                    executeModuleSubscriptions.call(module)
                } catch (error) {
                    handleModuleInitializeError(id, error)
                } finally {
                    importingModuleId = originalImportingId
                }
            }
        }
    }

    logger.log('Importing index module...')
    // ! Do NOT use requireModule for this
    __r(IndexMetroModuleId)

    const cacheRestored = await cacheRestoredPromise

    // Since cold starts are obsolete, we need to manually import all assets to cache their module IDs as they are imported lazily
    if (!cacheRestored) requireAssetModules()

    saveCache()
}

/**
 * Blacklists a module from being required
 * @param id
 */
export function blacklistModule(id: Metro.ModuleID) {
    cacheModuleAsBlacklisted(id)
    saveCache()
}

/**
 * Requires a module
 * @param id The module ID
 * @returns The exports of the module
 */
export function requireModule(id: Metro.ModuleID) {
    if (isModuleBlacklisted(id)) return

    const module = modules.get(id)!
    if (!module) return

    if (module.isInitialized && !module.hasError) return module.publicModule.exports

    const originalImportingId = id
    importingModuleId = id

    try {
        return __r(id)
    } catch (error) {
        handleModuleInitializeError(id, error)
    } finally {
        importingModuleId = originalImportingId
    }
}

/**
 * Subscribes to a module/all modules, calling the callback when the module is required
 * @param id The module ID
 * @param callback The callback to call when the module is required
 * @returns A function to unsubscribe
 */
export function afterSpecificModuleInitialized(id: Metro.ModuleID, callback: SpecificMetroModuleSubscriptionCallback) {
    if (!subscriptions.has(id)) subscriptions.set(id, new Set())
    const set = subscriptions.get(id)!
    set.add(callback)
    return () => set.delete(callback)
}

/**
 * Subscribes to all modules, calling the callback when the module is required
 * @param callback The callback to call when the module is required
 * @returns A function to unsubscribe
 */
export function afterModuleInitialized(callback: MetroModuleSubscriptionCallback) {
    allSubscriptionsSet.add(callback)
    return () => allSubscriptionsSet.delete(callback)
}

/**
 * Returns whether the module is blacklisted
 * @param id The module ID
 * @returns Whether the module is blacklisted (`0` means not blacklisted, any other integer means blacklisted)
 */
export function isModuleBlacklisted(id: Metro.ModuleID) {
    return cache.exportsFlags[id]! & MetroModuleFlags.Blacklisted
}

/**
 * Returns whether the module is an asset registrar
 * @param id The module ID
 * @returns Whether the module is an asset registrar
 */
export function isModuleAssetRegistrar(id: Metro.ModuleID) {
    return cache.exportsFlags[id]! & MetroModuleFlags.Asset
}

/** @internal */
function moduleShouldNotBeHooked(id: Metro.ModuleID) {
    // Blacklisted modules and asset registrars should not be hooked
    // It only slows down the startup and adds no value
    return isModuleBlacklisted(id) || isModuleAssetRegistrar(id)
}

/**
 * Yields the modules for a specific filter key
 * @param key Filter key
 */
export function* moduleIdsForFilter(key: string, fullLookup = false) {
    const lookupCache = cache.lookupFlags[key]
    const pending = new Set<Metro.ModuleID>()

    if (
        lookupCache?.f &&
        // Check if any modules were found
        !(lookupCache.f & MetroModuleLookupRegistryFlags.NotFound) &&
        // Pass immediately if it's not a full lookup, otherwise check if it's a full lookup
        (!fullLookup || lookupCache.f & MetroModuleLookupRegistryFlags.FullLookup)
    ) {
        for (const id of cachedModuleIdsForFilter(key)) {
            if (isModuleBlacklisted(id)) continue
            if (!modules.get(id)!.isInitialized) {
                pending.add(id)
                continue
            }

            yield id
        }

        for (const id of pending) yield id

        // Invalidate the cache if nothing was found...
        // We invalidate the cache and try to iterate over all modules
        delete cache.lookupFlags[key]
        pending.clear()
    }

    for (const id of modules.keys()) {
        if (isModuleBlacklisted(id)) continue
        if (!modules.get(id)!.isInitialized) {
            pending.add(id)
            continue
        }

        yield id
    }

    for (const id of pending) yield id

    // At this point, we have iterated over all modules, and nothing was found
}

/**
 * Returns whether the module has bad exports. If it does, it should be blacklisted and never patched
 * @param exports The exports of the module
 * @returns Whether the module has bad exports
 */
export function isModuleExportsBad(exports: Metro.ModuleExports) {
    return (
        exports === undefined ||
        exports === null ||
        exports === globalThis ||
        exports[''] === null ||
        (exports.__proto__ === Object.prototype && Reflect.ownKeys(exports).length === 0)
    )
}
