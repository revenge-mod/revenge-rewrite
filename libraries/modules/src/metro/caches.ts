import {
    FirstAssetTypeRegisteredKey,
    MetroCacheRelativeFilePath,
    MetroCacheVersion,
    MetroModuleFlags,
    MetroModuleLookupFlags,
    assetCacheIndexSymbol,
} from '../constants'
import { byProps } from '../filters'
import { findId } from '../finders'
import { ClientInfoModule, FileModule } from '../native'
import { logger } from '../shared'
import { blacklistModule, isModuleExportsBad, requireModule } from './index'

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
     * Registry for assets, the key being the name, and the value being objects with the asset type as key and the index as value
     * #### This is in-memory.
     */
    assets: {
        [assetCacheIndexSymbol]: {},
    } as Record<Asset['name'], Record<Asset['type'], number>> & {
        [assetCacheIndexSymbol]: Record<number, Asset['name']>
    },
    /**
     * Registry for assets modules, the key being the name,
     * and the value being objects with the asset type as key and the module ID of the module that registers the asset as value
     */
    assetModules: {
        [assetCacheIndexSymbol]: {},
    } as MetroCacheObject['a'],
    /**
     * Registry for patchable modules, the key being the patch, and the value being the module ID of the module to patch
     *
     * - `f`: File path tracking
     * - `r`: Fix native component registry duplicate register
     * - `b`: Blacklist freezing module
     * - `d`: Block Discord analytics
     * - `s`: Block Sentry initialization
     * - `m`: Fix Moment locale
     */
    patchableModules: {} as MetroCacheObject['p'],
    /**
     * Registry for module file paths
     * #### This is in-memory.
     */
    moduleFilePaths: new Map() as Map<Metro.ModuleID, string>,
    /**
     * The total modules count
     */
    totalModules: modules.size,
}

/** @internal */
export async function restoreCache() {
    logger.log('Attempting to restore cache...')

    // For testing:
    // invalidateCache()

    const path = `${FileModule.getConstants().CacheDirPath}/${MetroCacheRelativeFilePath}`

    if (!(await FileModule.fileExists(path))) return false
    const savedCache = await FileModule.readFile(path, 'utf8')

    const storedCache = JSON.parse(savedCache) as MetroCacheObject
    logger.log(
        `Cache found, validating... (compare: ${storedCache.v} === ${MetroCacheVersion}, ${storedCache.b} === ${ClientInfoModule.Build}, ${storedCache.t} === ${modules.size})`,
    )

    if (
        storedCache.v !== MetroCacheVersion ||
        storedCache.b !== ClientInfoModule.Build ||
        storedCache.t !== modules.size
    )
        return false

    logger.log(`Restoring cache of ${modules.size} modules`)

    cache.totalModules = storedCache.t
    cache.exportsFlags = storedCache.e
    cache.lookupFlags = storedCache.l
    cache.assetModules = storedCache.a

    cache.assets[assetCacheIndexSymbol] = {}
    cache.assetModules[assetCacheIndexSymbol] = {}

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
    for (const [id, module] of modules) {
        if (!module.dependencyMap) continue
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

    for (const [id, module] of modules) {
        if (!module.dependencyMap) continue
        if (module.dependencyMap.length === 1 && module.dependencyMap[0] === assetsRegistryExporterModuleId)
            requireModule(id)
    }
}

let savePending = false

/** @internal */
export async function saveCache() {
    if (savePending) return

    savePending = true

    await FileModule.writeFile(
        'cache',
        MetroCacheRelativeFilePath,
        JSON.stringify({
            v: MetroCacheVersion,
            b: ClientInfoModule.Build,
            t: cache.totalModules,
            e: cache.exportsFlags,
            l: cache.lookupFlags,
            a: cache.assetModules,
            p: cache.patchableModules,
        } satisfies MetroCacheObject),
        'utf8',
    )

    logger.log(`Cache saved (${cache.totalModules} modules)`)

    savePending = false
}

/** @internal */
export function invalidateCache() {
    FileModule.removeFile('cache', MetroCacheRelativeFilePath)
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
        cache: (id: Metro.ModuleID, exports: Metro.ModuleExports) => {
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
export function cacheModuleAsBlacklisted(id: Metro.ModuleID) {
    cache.exportsFlags[id]! |= MetroModuleFlags.Blacklisted
}

type Asset = ReactNativeInternals.AssetsRegistry.PackagerAsset

/** @internal */
export function cacheAsset(name: Asset['name'], index: number, moduleId: Metro.ModuleID, type: Asset['type']) {
    cache.assets[name] ??= {}
    // @ts-expect-error: Why is TypeScript like this?
    cache.assetModules[name] ??= { [FirstAssetTypeRegisteredKey]: type }

    cache.assets[name][type] = index
    cache.assetModules[name]![type] ??= moduleId

    // All in-memory
    cache.assets[assetCacheIndexSymbol][index] = name
    cache.assetModules[assetCacheIndexSymbol][index] = cache.assetModules[name]![type]

    cache.exportsFlags[moduleId]! |= MetroModuleFlags.Asset

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
    e: Record<Metro.ModuleID, number>
    l: Record<string, MetroLookupCacheRegistry | undefined>
    a: Record<
        Asset['name'],
        Record<Asset['type'], Metro.ModuleID> & { [FirstAssetTypeRegisteredKey]: Asset['type'] }
    > & { [assetCacheIndexSymbol]: Record<number, Metro.ModuleID> }
    p: Record<'f' | 'r' | 'b' | 's' | 'd' | 'm', number | undefined>
}

/**
 * Registry for Metro lookup cache, a glorified serializable Set if you will
 * @see {@link MetroCache}
 * @see {@link MetroModuleLookupFlags}
 */
export type MetroLookupCacheRegistry = Record<Metro.ModuleID, number> & {
    /**
     * Lookup flags for this registry
     */
    flags?: number
}
