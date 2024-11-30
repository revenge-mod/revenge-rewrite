import { assetsRegistry } from '@revenge-mod/modules/common'
import { findByName } from '@revenge-mod/modules/finders'
import { cacheAsset, getImportingModuleId, cache as metroCache, requireModule } from '@revenge-mod/modules/metro'
import { createPatcherInstance } from '@revenge-mod/patcher'

import type { ReactNativeInternals } from '@revenge-mod/revenge'
import type { ImageSourcePropType } from 'react-native'

const patcher = createPatcherInstance('revenge.library.assets')

const CustomAssetBrandKey = '__revenge_asset'
export const customAssets: Record<string, number> = {}

type PackagerAsset = ReactNativeInternals.AssetsRegistry.PackagerAsset

type CustomAsset = PackagerAsset & {
    [CustomAssetBrandKey]: string
}

patcher.after(
    assetsRegistry,
    'registerAsset',
    ([asset], index) => {
        if (CustomAssetBrandKey in asset) return
        const moduleId = getImportingModuleId()
        cacheAsset(asset.name, index, moduleId)
    },
    'patchRegisterAsset',
)

type AssetSourceResolver = {
    name: 'AssetSourceResolver'
    prototype: {
        asset: PackagerAsset | CustomAsset
        defaultAsset(): ImageSourcePropType
        fromSource(): ImageSourcePropType
    }
}

const AssetSourceResolver = findByName.async<AssetSourceResolver, true>('AssetSourceResolver').then(it => it!.prototype)

function maybeResolveCustomAsset(
    this: AssetSourceResolver['prototype'],
    args: unknown[],
    orig: (...args: unknown[]) => ImageSourcePropType,
) {
    if (CustomAssetBrandKey in this.asset) return { uri: this.asset[CustomAssetBrandKey] }
    return orig.apply(this, args)
}

patcher.instead.await(AssetSourceResolver, 'defaultAsset', maybeResolveCustomAsset)
patcher.instead.await(AssetSourceResolver, 'fromSource', maybeResolveCustomAsset)

const assetsIndex = new Proxy({} as Record<string, PackagerAsset | undefined>, {
    get(cache, prop: string) {
        if (cache[prop]) return cache[prop]
        return (cache[prop] = assetsRegistry.getAssetByID(Number(prop)))
    },
}) as Record<string, PackagerAsset | undefined>

export const AssetsLibrary = {
    index: assetsIndex,
    registerCustom: registerCustomAsset,
    getByName: getAssetByName,
    getIndexByName: getAssetIndexByName,
    getByIndex: getAssetByIndex,
}

export type AssetsLibrary = typeof AssetsLibrary

export function registerCustomAsset(asset: Pick<PackagerAsset, 'width' | 'height' | 'type' | 'name'>, source: string) {
    return (customAssets[asset.name] = assetsRegistry.registerAsset({
        ...asset,
        __packager_asset: true,
        scales: [1],
        [CustomAssetBrandKey]: source,
        hash: '',
        httpServerLocation: `/(custom)/${asset.name}.${asset.type}`,
    } as PackagerAsset))
}

export function isCustomAsset(asset: PackagerAsset): asset is CustomAsset {
    return CustomAssetBrandKey in asset
}

/**
 * Returns the asset tied to the given name
 * @param name The name of the asset
 * @returns The asset tied to the name
 */
export function getAssetByName(name: string) {
    return getAssetByIndex((customAssets[name] ?? metroCache.assets[name])!)
}

/**
 * Returns the asset tied to the given index
 * @param index The index of the asset
 * @returns The asset tied to the index
 */
export function getAssetByIndex(index: number) {
    return assetsIndex[index]
}

/**
 * Returns the asset index tied to given name
 * @param name The name of the asset
 * @returns The asset index tied to the name
 */
export function getAssetIndexByName(name: string) {
    if (name in customAssets) return customAssets[name]

    const moduleId = metroCache.assetModules[name]
    if (!moduleId) return
    return (metroCache.assets[name] ??= requireModule(moduleId))
}
