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
    type MetroCacheObject,
    type MetroLookupCacheRegistry,
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

const subscriptions = new Map<Metro.ModuleID | 'all', Set<MetroModuleSubscriptionCallback>>()
const allSubscriptionSet = new Set<MetroModuleSubscriptionCallback>()
subscriptions.set('all', allSubscriptionSet)

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

function tryHookModule(id: Metro.ModuleID, metroModule: Metro.ModuleDefinition) {
    if (isModuleBlacklisted(id)) return

    // Allow patching already initialized modules
    // I don't know why this is needed, as we only require index after we hook a few modules...
    if (metroModule.isInitialized) {
        const subs = subscriptions.get(id)
        if (subs) for (const sub of subs) sub(id, metroModule.publicModule.exports)
        for (const sub of allSubscriptionSet) sub(id, metroModule.publicModule.exports)
    }

    if (metroModule!.factory) {
        const unpatch = patcher.instead(
            metroModule as Metro.ModuleDefinition<false>,
            'factory',
            (args, origFunc) => {
                const originalImportingId = importingModuleId
                importingModuleId = id

                const { 4: moduleObject } = args

                // TODO: Check if this is required
                // // metroImportDefault
                // args[2] = id => {
                //     const exps = metroRequire(id)
                //     return exps?.__esModule ? exps.default : exps
                // }

                // // metroImportAll
                // args[3] = id => {
                //     const exps = metroRequire(id)
                //     if (exps?.__esModule) return exps
                //     return {
                //         default: exps,
                //         ...exps,
                //     }
                // }

                try {
                    origFunc(...args)
                } catch (error) {
                    logger.log(`Blacklisted module ${id} because it could not be initialized: ${error}`)
                    unpatch()
                    blacklistModule(id)
                }

                if (isModuleExportsBad(moduleObject.exports)) blacklistModule(id)
                else {
                    const subs = subscriptions.get(id)
                    if (subs) for (const sub of subs) sub(id, moduleObject.exports)
                    for (const sub of allSubscriptionSet) sub(id, moduleObject.exports)
                }

                importingModuleId = originalImportingId
            },
            'moduleFactory',
        )
    }
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

    let hookCount = 0
    // I've tested values, and I've found the best value for not missing any modules and being the fastest
    for (; hookCount < Math.min(metroDependencies.size, SafeModuleHookAmountBeforeDefer); hookCount++) {
        const id = moduleIds.next().value!
        const metroModule = metroModules[id]!

        tryHookModule(id, metroModule)
    }

    logger.log('Importing index module...')
    // ! Do NOT use requireModule for this
    __r(IndexMetroModuleId)
    recordTimestamp('Modules_IndexRequired')

    // Without this delay, sometimes causes the app to be in a limbo state
    // The reason is unknown...
    setImmediate(() => {
        let id = moduleIds.next().value
        if (!id) return

        do {
            const metroModule = metroModules[id]!
            tryHookModule(id, metroModule)
        } while ((id = moduleIds.next().value))

        recordTimestamp('Modules_HookedFactories')
    })

    // Since cold starts are obsolete, we need to manually import all assets to cache their module IDs as they are imported lazily
    if (!cacheRestored) {
        const unpatch = patcher.before(
            ReactNative.AppRegistry,
            'runApplication',
            () => {
                unpatch()
                requireAssetModules()
                recordTimestamp('Modules_RequiredAssets')
            },
            'createAssetCache',
        )
    }

    cache.totalModules = metroDependencies.size
    saveCache()
}

/**
 * Blacklists a module from being required
 * @param id
 */
export function blacklistModule(id: Metro.ModuleIDKey) {
    Object.defineProperty(getMetroModules(), id, { enumerable: false })
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
        if (!subscriptions.has(id)) subscriptions.set(id, new Set())
        const set = subscriptions.get(id)!
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
            allSubscriptionSet.add(callback)
            return () => allSubscriptionSet.delete(callback)
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
            if (isModuleExportsBad(exports)) {
                blacklistModule(id)
                continue
            }

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
        !exports ||
        exports === globalThis ||
        exports[''] === null ||
        (exports.__proto__ === Object.prototype && Reflect.ownKeys(exports).length === 0)
    )
}
