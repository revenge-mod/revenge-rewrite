import { recordTimestamp } from '@revenge-mod/debug'

import {
    IndexMetroModuleId,
    MetroModuleFlags,
    MetroModuleLookupFlags,
    SafeModuleHookAmountBeforeDefer,
} from '../constants'
import { logger, patcher } from '../shared'
import { cacheModuleAsBlacklisted, indexedModuleIdsForLookup, metroCache, requireAssetModules, restoreCache, saveCache } from './caches'
import { patchModuleOnLoad } from './patcher'

import type { Metro } from '../types'

export * from './caches'
export * from './patcher'

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

/**
 * Metro dependencies to require, if no cache is available
 * @internal
 */
export const metroDependencies = new Set<Metro.ModuleID>()

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

    if (metroModule!.factory) {
        const unpatch = patcher.instead(
            metroModule as Metro.ModuleDefinition<false>,
            'factory',
            (args, origFunc) => {
                const originalImportingId = importingModuleId
                importingModuleId = id

                const { 1: metroRequire, 4: moduleObject } = args

                // metroImportDefault
                args[2] = id => {
                    const exps = metroRequire(id)
                    return exps?.__esModule ? exps.default : exps
                }

                // metroImportAll
                args[3] = id => {
                    const exps = metroRequire(id)
                    if (exps?.__esModule) return exps
                    return {
                        default: exps,
                        ...exps,
                    }
                }

                try {
                    origFunc(...args)
                } catch (error) {
                    logger.log(`Blacklisted module ${id} because it could not be initialized: ${error}`)
                    unpatch()
                    blacklistModule(id)
                }

                if (moduleHasBadExports(moduleObject.exports)) blacklistModule(id)
                else {
                    const subs = subscriptions.get(id)
                    if (subs) for (const sub of subs) sub(id, moduleObject.exports)
                    for (const sub of allSubscriptionSet) sub(id, moduleObject.exports)

                    // TODO: Move this to call subscribeModule.all instead?
                    patchModuleOnLoad(moduleObject.exports, id)
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

    // for (const id of metroDependencies) tryHookModule(id, metroModules[id]!)

    // TODO: Experimental
    // To be reliable in finding modules, we need to hook module factories before requiring index
    // This slows down the app by a bit (up to 1s), so we defer some of the later modules to be hooked later
    const moduleIds = [...metroDependencies]

    let lastHookedIndex = 0
    // I've tested values, and I've found the best value for not missing any modules and being the fastest
    for (; lastHookedIndex < Math.min(moduleIds.length, SafeModuleHookAmountBeforeDefer); lastHookedIndex++) {
        const id = moduleIds[lastHookedIndex]!
        const metroModule = metroModules[id]!

        tryHookModule(id, metroModule)
    }

    // I'd use setTimeout here, but we missed a few modules due to that
    setImmediate(() => {
        for (; lastHookedIndex < moduleIds.length; lastHookedIndex++) {
            const id = moduleIds[lastHookedIndex]!
            const metroModule = metroModules[id]!

            tryHookModule(id, metroModule)
        }
    })

    recordTimestamp('Modules_HookedFactories')

    // Since cold starts are obsolete, we need to manually import all assets to cache their module IDs as they are imported lazily
    if (!cacheRestored)
        setImmediate(() => {
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
        })

    logger.log('Importing index module...')
    // ! Do NOT use requireModule for this
    __r(IndexMetroModuleId)
    recordTimestamp('Modules_IndexRequired')

    metroCache.totalModules = metroDependencies.size
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

    if (isModuleBlacklisted(id)) return false

    const metroModule = metroModules[id]
    // TODO: Would the modules be incomplete if we returned metroModule.publicModule.exports instead?
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
    }

    ErrorUtils.setGlobalHandler(ogHandler)
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
    if (!(id in metroCache.exportsFlags)) return 0
    return metroCache.exportsFlags[id]! & MetroModuleFlags.Blacklisted
}

/**
 * Yields the modules for a specific finder call
 * @param key Filter key
 */
export function* modulesForFinder(key: string) {
    const lookupCache = metroCache.lookupFlags[key]

    if (lookupCache?.flags) {
        if (!(lookupCache.flags & MetroModuleLookupFlags.NotFound))
            for (const id in indexedModuleIdsForLookup(key)) {
                if (isModuleBlacklisted(id)) continue

                // TODO: Extra blacklisting checks shouldn't be required here
                yield [id, requireModule(Number(id))]
            }
    } else {
        for (const id of metroDependencies) {
            if (lookupCache?.[id]) continue

            const mid = Number(id)
            if (isModuleBlacklisted(mid)) continue

            const exports = requireModule(mid)
            if (moduleHasBadExports(exports)) {
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
export function moduleHasBadExports(exports: Metro.ModuleExports) {
    return (
        !exports ||
        exports === globalThis ||
        exports[''] === null ||
        (exports.__proto__ === Object.prototype && Reflect.ownKeys(exports).length === 0)
    )
}
