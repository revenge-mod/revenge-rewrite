import { IndexMetroModuleId, MetroModuleFlags, MetroModuleLookupFlags } from '../constants'
import { byProps } from '../filters'
import { findId } from '../finders'
import { CacheModule, ClientInfoModule } from '../native'
import { logger } from '../shared'
import { blacklistModule, getMetroModules, metroDependencies, requireModule, resolveModuleDependencies } from './index'

import type { ReactNativeInternals } from '@revenge-mod/revenge'
import type { Metro } from '../types'

const version = 1
const mmkvKey = 'revenge-metro-cache'

export const metroCache = {
    /**
     * Flags for each module's exports
     * @see {@link MetroModuleFlags}
     */
    exportsFlags: {} as MetroCacheObject['e'],
    /**
     * Lookup registry for each filters, the key being the filter key, and the value being the registry
     * @see {@link MetroCacheRegistry}
     * @see {@link MetroModuleLookupFlags}
     */
    lookupFlags: {} as MetroCacheObject['l'],
    /**
     * Registry for assets, the key being the name, and the value being the asset index
     * #### This is in-memory.
     */
    assets: {} as Record<Asset['name'], number>,
    /**
     * Registry for assets modules, the key being the name, and the value being the module ID of the module that registers the asset
     */
    assetModules: {} as MetroCacheObject['a'],
    /**
     * The total modules count
     */
    totalModules: 0,
}

/** @internal */
export async function restoreCache() {
    logger.log('Attempting to restore cache...')

    resolveModuleDependencies(getMetroModules(), IndexMetroModuleId)
    // For testing:
    // invalidateCache()

    const savedCache = await CacheModule.getItem(mmkvKey)
    if (!savedCache) return false

    const storedCache = JSON.parse(savedCache) as MetroCacheObject
    logger.log(
        `Cache found, validating... (compare: ${storedCache.v} === ${version}, ${storedCache.b} === ${ClientInfoModule.Build}, ${storedCache.t} === ${metroDependencies.size})`,
    )

    if (
        storedCache.v !== version ||
        storedCache.b !== ClientInfoModule.Build ||
        storedCache.t !== metroDependencies.size
    )
        return false

    logger.log(`Restoring cache of ${metroDependencies.size} modules`)

    metroCache.totalModules = storedCache.t
    metroCache.exportsFlags = storedCache.e
    metroCache.lookupFlags = storedCache.l
    metroCache.assetModules = storedCache.a

    return true
}

/**
 * @internal
 * @deprecated We no longer need cold starts, modules are required as needed. \
 * We needed it before to blacklist a problematic module, but now due to loading index bundle after all module factories are hooked... \
 * We can blacklist the module by seeing its parent's exports, it was previously too late to look into the parent's exports.
 */
export function createCache() {
    // For some reason, running this next tick makes the app not crash
    // Note that we should never wait for this to finish, this doesn't need to be awaited
    setTimeout(() => {
        metroCache.totalModules = metroDependencies.size
        logger.log(`This is a cold start, importing ${metroCache.totalModules} dependencies...`)
        for (const id of metroDependencies) requireModule(id)
        saveCache()
    })
}

/**
 * Filters all "asset" modules and requires them, making them cacheable
 */
export function requireAssetModules() {
    const [assetsRegistryModuleId] = findId(byProps('registerAsset'))
    if (!assetsRegistryModuleId)
        return void logger.warn(
            'Unable to create asset cache, cannot find assets-registry module ID, some assets may not load',
        )

    let assetsRegistryExporterModuleId = 0
    for (const id of metroDependencies) {
        const module = modules[id]
        if (!module?.dependencyMap) continue
        if (module.dependencyMap.length === 1 && module.dependencyMap[0] === assetsRegistryModuleId)
            assetsRegistryExporterModuleId = id
    }

    if (!assetsRegistryExporterModuleId)
        return void logger.warn(
            'Unable to create asset cache, cannot find assets-registry exporter module ID, some assets may not load',
        )

    logger.log('Importing all assets modules...')

    for (const id of metroDependencies) {
        const module = modules[id]
        if (!module?.dependencyMap) continue
        if (module.dependencyMap.length === 1 && module.dependencyMap[0] === assetsRegistryExporterModuleId)
            requireModule(id)
    }
}

let saveCacheDebounceTimeoutId: number

/** @internal */
export function saveCache() {
    if (saveCacheDebounceTimeoutId) clearTimeout(saveCacheDebounceTimeoutId)
    saveCacheDebounceTimeoutId = setTimeout(() => {
        CacheModule.setItem(
            mmkvKey,
            JSON.stringify({
                v: version,
                b: ClientInfoModule.Build,
                t: metroCache.totalModules,
                e: metroCache.exportsFlags,
                l: metroCache.lookupFlags,
                a: metroCache.assetModules,
            } satisfies MetroCacheObject),
        )

        logger.log(`Cache saved (${metroCache.totalModules} modules)`)
    }, 1000)
}

/** @internal */
export function invalidateCache() {
    CacheModule.removeItem(mmkvKey)
    logger.warn('Cache invalidated')
}

/**
 * Returns a cacher object for a given filter key
 * @param key The filter key
 * @returns A cacher object
 */
export function cacherFor(key: string) {
    const registry = (metroCache.lookupFlags[key] ??= {})

    return {
        cache: (id: Metro.ModuleIDKey, exports: Metro.ModuleExports) => {
            registry[id] ??= MetroModuleFlags.Exists
            // We cannot do !exports here as exports may be a boolean or a number which is falsy
            if (typeof exports === 'undefined' || exports === null) {
                blacklistModule(id)
                registry[id] |= MetroModuleFlags.Blacklisted
            }
        },
        finish: (notFound: boolean) => {
            const prevRegistryFlags = registry.flags
            registry.flags ??= 0
            if (notFound) registry.flags |= MetroModuleLookupFlags.NotFound
            // Prevent saving too much
            if (prevRegistryFlags !== registry.flags) saveCache()
        },
    }
}

/** @internal */
export function cacheModule(id: Metro.ModuleIDKey) {
    metroCache.exportsFlags[id] ??= MetroModuleFlags.Exists
}

/** @internal */
export function cacheModuleAsBlacklisted(id: Metro.ModuleIDKey) {
    // Module must exist to be blacklisted
    cacheModule(id)
    metroCache.exportsFlags[id]! |= MetroModuleFlags.Blacklisted
}

type Asset = ReactNativeInternals.AssetsRegistry.PackagerAsset

/** @internal */
export function cacheAsset(name: Asset['name'], index: number, moduleId: Metro.ModuleID) {
    metroCache.assets[name] = index
    metroCache.assetModules[name] = moduleId
    saveCache()
}

/**
 * The cache object for Metro modules
 * @see {@link MetroCache}
 */
export interface MetroCacheObject {
    v: number
    b: string
    t: number
    e: Record<Metro.ModuleIDKey, number>
    l: Record<string, MetroCacheRegistry | undefined>
    a: Record<Asset['name'], Metro.ModuleID>
}

/**
 * Registry for Metro cache
 * @see {@link MetroCache}
 * @see {@link MetroModuleLookupFlags}
 */
export type MetroCacheRegistry = Record<Metro.ModuleIDKey, number> & {
    /**
     * Lookup flags for this registry
     */
    flags?: number
}
