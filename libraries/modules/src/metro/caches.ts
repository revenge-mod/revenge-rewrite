import {
    IndexMetroModuleId,
    MetroCacheKey,
    MetroCacheVersion,
    MetroModuleFlags,
    MetroModuleLookupFlags,
} from '../constants'
import { byProps } from '../filters'
import { findId } from '../finders'
import { CacheModule, ClientInfoModule } from '../native'
import { logger } from '../shared'
import {
    blacklistModule,
    dependencies,
    getMetroModules,
    isModuleExportsBad,
    requireModule,
    resolveModuleDependencies,
} from './index'

import type { ReactNativeInternals } from '@revenge-mod/revenge'
import type { Metro } from '../types'

export const cache = {
    /**
     * Flags for each module's exports
     * @see {@link MetroModuleFlags}
     */
    exportsFlags: {} as MetroCacheObject['e'],
    /**
     * Lookup registry for each filters, the key being the filter key, and the value being the registry
     * @see {@link MetroLookupCacheRegistry}
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
     * Registry for patchable modules, the key being the patch, and the value being the module ID of the module to patch
     *
     * - `f`: File path tracking
     * - `r`: Fix native component registry duplicate register
     * - `b`: Blacklist freezing module
     * - `d`: Block Discord analytics
     * - `s`: Block Sentry initialization
     */
    patchableModules: {} as MetroCacheObject['p'],
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

    const savedCache = await CacheModule.getItem(MetroCacheKey)
    if (!savedCache) return false

    const storedCache = JSON.parse(savedCache) as MetroCacheObject
    logger.log(
        `Cache found, validating... (compare: ${storedCache.v} === ${MetroCacheVersion}, ${storedCache.b} === ${ClientInfoModule.Build}, ${storedCache.t} === ${dependencies.size})`,
    )

    if (
        storedCache.v !== MetroCacheVersion ||
        storedCache.b !== ClientInfoModule.Build ||
        storedCache.t !== dependencies.size
    )
        return false

    logger.log(`Restoring cache of ${dependencies.size} modules`)

    cache.totalModules = storedCache.t
    cache.exportsFlags = storedCache.e
    cache.lookupFlags = storedCache.l
    cache.assetModules = storedCache.a

    return true
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
    for (const id of dependencies) {
        const module = modules[id]
        if (!module?.dependencyMap) continue
        if (module.dependencyMap.length === 1 && module.dependencyMap[0] === assetsRegistryModuleId) {
            assetsRegistryExporterModuleId = id
            break
        }
    }

    if (!assetsRegistryExporterModuleId)
        return void logger.warn(
            'Unable to create asset cache, cannot find assets-registry exporter module ID, some assets may not load',
        )

    logger.log('Importing all assets modules...')

    for (const id of dependencies) {
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
            MetroCacheKey,
            JSON.stringify({
                v: MetroCacheVersion,
                b: ClientInfoModule.Build,
                t: cache.totalModules,
                e: cache.exportsFlags,
                l: cache.lookupFlags,
                a: cache.assetModules,
                p: cache.patchableModules,
            } satisfies MetroCacheObject),
        )

        logger.log(`Cache saved (${cache.totalModules} modules)`)
    }, 1000)
}

/** @internal */
export function invalidateCache() {
    CacheModule.removeItem(MetroCacheKey)
    logger.warn('Cache invalidated')
}

/**
 * Returns a cacher object for a given filter key
 * @param key The filter key
 * @returns A cacher object
 */
export function cacherFor(key: string) {
    const registry = (cache.lookupFlags[key] ??= {})
    let invalidated = false

    return {
        cache: (id: Metro.ModuleIDKey, exports: Metro.ModuleExports) => {
            // biome-ignore lint/style/noCommaOperator: Sets invalidated to true if this is a new module
            registry[id] ??= ((invalidated = true), 0)

            if (isModuleExportsBad(exports)) {
                blacklistModule(id)
                invalidated = true
                if (id in registry) delete registry[id]
            }
        },
        finish: (notFound: boolean, fullLookup = false) => {
            registry.flags ??= 0
            if (notFound) registry.flags |= MetroModuleLookupFlags.NotFound
            if (fullLookup) registry.flags |= MetroModuleLookupFlags.FullLookup
            if (invalidated) saveCache()
        },
    }
}

/** @internal */
export function cacheModuleAsBlacklisted(id: Metro.ModuleIDKey) {
    cache.exportsFlags[id]! |= MetroModuleFlags.Blacklisted
}

type Asset = ReactNativeInternals.AssetsRegistry.PackagerAsset

/** @internal */
export function cacheAsset(name: Asset['name'], index: number, moduleId: Metro.ModuleID) {
    cache.assets[name] = index
    cache.assetModules[name] = moduleId
    saveCache()
}

export function* indexedModuleIdsForLookup(key: string) {
    const modulesMap = cache.lookupFlags[key]
    if (!modulesMap) return undefined

    for (const k in modulesMap) {
        if (k !== 'flags') yield Number(k)
    }
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
    l: Record<string, MetroLookupCacheRegistry | undefined>
    a: Record<Asset['name'], Metro.ModuleID>
    p: Record<'f' | 'r' | 'b' | 's' | 'd', number | undefined>
}

/**
 * Registry for Metro lookup cache, a glorified serializable Set if you will
 * @see {@link MetroCache}
 * @see {@link MetroModuleLookupFlags}
 */
export type MetroLookupCacheRegistry = Record<Metro.ModuleIDKey, number> & {
    /**
     * Lookup flags for this registry
     */
    flags?: number
}
