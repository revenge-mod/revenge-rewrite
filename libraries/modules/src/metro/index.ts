import { recordTimestamp } from '@revenge-mod/debug'

import {
    IndexMetroModuleId,
    MetroModuleFlags,
    MetroModuleLookupFlags,
    SafeModuleHookAmountBeforeDefer,
} from '../constants'
import { logger, patcher } from '../shared'

import {
    cache,
    cacheModuleAsBlacklisted,
    indexedModuleIdsForLookup,
    requireAssetModules,
    restoreCache,
    saveCache,
} from './caches'
import { initializeModulePatches } from './patches'

import type { Metro } from '../types'

export {
    cacheAsset,
    cacheModuleAsBlacklisted,
    cacherFor,
    indexedModuleIdsForLookup,
    invalidateCache,
    cache,
} from './caches'

/**
 * Gets the Metro modules. Such a function is needed because for some reason, accessing `globalThis.modules` directly is incredibly slow... but a function call to it is faster..?
 * @internal
 */
export function getMetroModules() {
    return globalThis.modules
}

let importingModuleId = -1

/**
 * Gets the module ID that is currently being imported, `-1` if none
 */
export function getImportingModuleId() {
    return importingModuleId
}

export type MetroModuleSubscriptionCallback = (id: Metro.ModuleID, exports: Metro.ModuleExports) => unknown

const subscriptions: Record<Metro.ModuleID | 'all', Set<MetroModuleSubscriptionCallback>> = {
    all: new Set<MetroModuleSubscriptionCallback>(),
}

const metroDependencies = new Set<Metro.ModuleID>()

/**
 * Metro dependencies to require, if no cache is available
 * @internal
 */
export const dependencies = metroDependencies

const resolvedModules = new Set<Metro.ModuleID>()

/**
 * Recursively resolves dependencies and subdependencies of a module
 * @param modules Metro modules object
 * @param id The ID of the module to resolve
 * @internal
 */
export function resolveModuleDependencies(modules: Metro.ModuleList, id: Metro.ModuleID) {
    const metroModule = modules[id]
    // If somehow, the module does not exist
    if (!metroModule) return void metroDependencies.delete(id)
    if (!metroModule.dependencyMap || resolvedModules.has(id)) return

    resolvedModules.add(id)

    for (const depId of metroModule.dependencyMap) {
        metroDependencies.add(depId)
        resolveModuleDependencies(modules, depId)
    }
}

function hookModule(id: Metro.ModuleID, metroModule: Metro.ModuleDefinition) {
    // Allow patching already initialized modules
    // These are critical modules like React, React Native, some polyfills, and native modules
    if (metroModule.isInitialized) {
        logger.warn(`Hooking already initialized module: ${id}`)

        if (isModuleExportsBad(metroModule.publicModule.exports)) {
            blacklistModule(id)
            return false
        }

        const subs = subscriptions[id]
        if (subs) for (const sub of subs) sub(id, metroModule.publicModule.exports)
        for (const sub of subscriptions.all) sub(id, metroModule.publicModule.exports)

        return false
    }

    const unpatch = patcher.instead(
        metroModule as Metro.ModuleDefinition<false>,
        'factory',
        (args, origFunc) => {
            unpatch()

            const originalImportingId = importingModuleId

            const { 4: moduleObject } = args

            try {
                importingModuleId = id
                origFunc(...args)
            } catch (error) {
                logger.log(`Blacklisted module ${id} because it could not be initialized: ${error}`)
                blacklistModule(id)
            }

            importingModuleId = originalImportingId

            if (isModuleExportsBad(moduleObject.exports)) blacklistModule(id)
            else {
                const subs = subscriptions[id]
                if (subs) for (const sub of subs) sub(id, moduleObject.exports)
                for (const sub of subscriptions.all) sub(id, moduleObject.exports)
            }
        },
        'moduleFactory',
    )

    return true
}

/**
 * Initializes the Metro modules patches and caches
 */
export async function initializeModules() {
    const metroModules = getMetroModules()
    if (metroModules[IndexMetroModuleId]?.isInitialized) throw new Error('Metro modules has already been initialized')

    const cacheRestored = await restoreCache()
    recordTimestamp('Modules_TriedRestoreCache')

    // Patches modules on load
    initializeModulePatches(patcher, logger, metroModules)

    // To be reliable in finding modules, we need to hook module factories before requiring index
    // Hooking all modules before requiring index slows down startup up to 1s, so we defer some of the later modules to be hooked later
    const moduleIds = metroDependencies.values()

    let hookCountLeft = Math.min(metroDependencies.size, SafeModuleHookAmountBeforeDefer)
    // I've tested values, and I've found the best value for not missing any modules and being the fastest
    while (hookCountLeft > -1) {
        const id = moduleIds.next().value!
        if (moduleShouldNotBeHooked(id)) continue
        hookModule(id, metroModules[id]!)
        --hookCountLeft
    }

    logger.log('Importing index module...')
    // ! Do NOT use requireModule for this
    __r(IndexMetroModuleId)
    recordTimestamp('Modules_IndexRequired')

    let id = moduleIds.next().value
    if (!id) return

    do {
        if (moduleShouldNotBeHooked(id)) continue
        hookModule(id, metroModules[id]!)
    } while ((id = moduleIds.next().value))

    recordTimestamp('Modules_HookedFactories')

    // Since cold starts are obsolete, we need to manually import all assets to cache their module IDs as they are imported lazily
    if (!cacheRestored) {
        requireAssetModules()
        recordTimestamp('Modules_RequiredAssets')
    }

    cache.totalModules = metroDependencies.size
    saveCache()
}

/**
 * Blacklists a module from being required
 * @param id
 */
export function blacklistModule(id: Metro.ModuleIDKey) {
    cacheModuleAsBlacklisted(id)
    saveCache()
}

/**
 * Requires a module
 * @param id The module ID
 * @returns The exports of the module
 */
export function requireModule(id: Metro.ModuleID) {
    const metroModules = getMetroModules()

    if (isModuleBlacklisted(id)) return

    const metroModule = metroModules[id]
    if (metroModule?.isInitialized && !metroModule.hasError) return __r(id)

    const ogHandler = ErrorUtils.getGlobalHandler()
    ErrorUtils.setGlobalHandler((err, isFatal) => {
        logger.error(`Blacklisting module ${id} because it could not be imported (fatal = ${isFatal}): ${err} `)
        blacklistModule(id)
    })

    const originalImportingId = id
    let moduleExports: unknown
    try {
        importingModuleId = id
        moduleExports = __r(id)
    } catch (error) {
        logger.error(`Blacklisting module ${id} because it could not be imported: ${error}`)
        blacklistModule(id)
    } finally {
        importingModuleId = originalImportingId
        ErrorUtils.setGlobalHandler(ogHandler)
    }

    return moduleExports
}

/**
 * Subscribes to a module, calling the callback when the module is required
 * @param id The module ID
 * @param callback The callback to call when the module is required
 * @returns A function to unsubscribe
 */
export const subscribeModule = Object.assign(
    function subscribeModule(id: Metro.ModuleID, callback: MetroModuleSubscriptionCallback) {
        if (!(id in subscriptions)) subscriptions[id] = new Set()
        const set = subscriptions[id]!
        set.add(callback)
        return () => set.delete(callback)
    },
    {
        /**
         * Subscribes to a module once, calling the callback when the module is required
         * @param id The module ID
         * @param callback The callback to call when the module is required
         * @returns A function to unsubscribe
         */
        once: function subscribeModuleOnce(id: Metro.ModuleID, callback: MetroModuleSubscriptionCallback) {
            const unsub = subscribeModule(id, (...args) => {
                unsub()
                callback(...args)
            })

            return unsub
        },
    },
    {
        /**
         * Subscribes to all modules, calling the callback when any modules are required
         * @param callback The callback to call when any modules are required
         * @returns A function to unsubscribe
         */
        all: function subscribeModuleAll(callback: MetroModuleSubscriptionCallback) {
            subscriptions.all.add(callback)
            return () => subscriptions.all.delete(callback)
        },
    },
)

/**
 * Returns whether the module is blacklisted
 * @param id The module ID
 * @returns Whether the module is blacklisted (`0` means not blacklisted, any other integer means blacklisted)
 */
export function isModuleBlacklisted(id: Metro.ModuleIDKey) {
    if (!(id in cache.exportsFlags)) return 0
    return cache.exportsFlags[id]! & MetroModuleFlags.Blacklisted
}

/**
 * Returns whether the module is an asset registrar
 * @param id The module ID
 * @returns Whether the module is an asset registrar
 */
export function isModuleAssetRegistrar(id: Metro.ModuleIDKey) {
    if (!(id in cache.exportsFlags)) return 0
    return cache.exportsFlags[id]! & MetroModuleFlags.Asset
}

/** @internal */
function moduleShouldNotBeHooked(id: Metro.ModuleIDKey) {
    // Blacklisted modules and asset registrars should not be hooked
    // It only slows down the startup and adds no value
    return isModuleBlacklisted(id) || isModuleAssetRegistrar(id)
}

/**
 * Yields the modules for a specific finder call
 * @param key Filter key
 */
export function* modulesForFinder(key: string, fullLookup = false) {
    const lookupCache = cache.lookupFlags[key]

    if (
        lookupCache?.flags &&
        // Check if any modules were found
        !(lookupCache.flags & MetroModuleLookupFlags.NotFound) &&
        // Pass immediately if it's not a full lookup, otherwise check if it's a full lookup
        (!fullLookup || lookupCache.flags & MetroModuleLookupFlags.FullLookup)
    )
        for (const id in indexedModuleIdsForLookup(key)) {
            if (isModuleBlacklisted(id)) continue
            yield [id, requireModule(Number(id))]
        }
    else {
        for (const id of metroDependencies) {
            const mid = Number(id)
            if (isModuleBlacklisted(mid)) continue

            const exports = requireModule(mid)
            if (!exports) continue

            yield [mid, exports]
        }
    }
}

/**
 * Returns whether the module has bad exports. If it does, it should be blacklisted and never patched
 * @param exports The exports of the module
 * @returns Whether the module has bad exports
 */
export function isModuleExportsBad(exports: Metro.ModuleExports) {
    return (
        typeof exports === 'undefined' ||
        exports === null ||
        exports === globalThis ||
        exports[''] === null ||
        (exports.__proto__ === Object.prototype && Reflect.ownKeys(exports).length === 0)
    )
}
