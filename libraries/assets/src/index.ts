import { assetsRegistry } from '@revenge-mod/modules/common'
import { cacheAsset, getImportingModuleId, cache as metroCache, requireModule } from '@revenge-mod/modules/metro'
import { createPatcherInstance } from '@revenge-mod/patcher'

import type { ReactNativeInternals } from '@revenge-mod/revenge'

const patcher = createPatcherInstance('revenge.library.assets')

patcher.after(
    assetsRegistry,
    'registerAsset',
    ([asset], index) => {
        // // A lot of duplicate assets are registered, so we need to check if it's already in the cache
        // if (asset.name in metroCache.assets) return
        const moduleId = getImportingModuleId()
        cacheAsset(asset.name, index, moduleId)
    },
    'patchRegisterAsset',
)

const assets = new Proxy(
    Object.fromEntries(
        Object.entries(metroCache.assets).map(([key, index]) => [key, assetsRegistry.getAssetByID(index)]),
    ) as Record<string, ReactNativeInternals.AssetsRegistry.PackagerAsset | undefined>,
    {
        get(cache, prop: string) {
            if (cache[prop]) return cache[prop]
            return assetsRegistry.getAssetByID(Number(prop))
        },
    },
) as Record<string, ReactNativeInternals.AssetsRegistry.PackagerAsset | undefined>

export const AssetsLibrary = {
    assets,
    getByName: getAssetByName,
    getIndexByName: getAssetIndexByName,
    getByIndex: getAssetByIndex,
}

export type AssetsLibrary = typeof AssetsLibrary

/**
 * Returns the asset tied to the given name
 * @param name The name of the asset
 * @returns The asset tied to the name
 */
function getAssetByName(name: string) {
    return getAssetByIndex(metroCache.assets[name]!)
}

/**
 * Returns the asset tied to the given index
 * @param index The index of the asset
 * @returns The asset tied to the index
 */
function getAssetByIndex(index: number) {
    return assets[index]
}

/**
 * Returns the asset index tied to given name
 * @param name The name of the asset
 * @returns The asset index tied to the name
 */
function getAssetIndexByName(name: string) {
    const cachedId = metroCache.assets[name]
    if (cachedId) return cachedId

    const moduleId = metroCache.assetModules[name]
    if (!moduleId) return
    return (metroCache.assets[name] = requireModule(moduleId))
}
