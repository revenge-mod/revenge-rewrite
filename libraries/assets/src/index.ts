import { assetsRegistry } from '@revenge-mod/modules/common'
import { findByName } from '@revenge-mod/modules/finders'
import { getImportingModuleId, requireModule } from '@revenge-mod/modules/metro'
import { createPatcherInstance } from '@revenge-mod/patcher'

import { cache, cacheAsset } from '@revenge-mod/modules/metro/caches'
import { FirstAssetTypeRegisteredKey, assetCacheIndexSymbol } from '@revenge-mod/modules/constants'

import type { ReactNativeInternals } from '@revenge-mod/revenge'
import type { ImageSourcePropType } from 'react-native'

const patcher = createPatcherInstance('revenge.library.assets')

const CustomAssetBrandKey = '__revenge_asset'
export const customAssets: Record<string, number> = {}

type PackagerAsset = ReactNativeInternals.AssetsRegistry.PackagerAsset

type CustomAsset = PackagerAsset & {
    [CustomAssetBrandKey]: string
}

let defaultPreferredType: PackagerAsset['type'] = ReactNative.Platform.OS === 'ios' ? 'png' : 'svg'

patcher.after(
    assetsRegistry,
    'registerAsset',
    ([asset], index) => {
        if (CustomAssetBrandKey in asset) return
        const moduleId = getImportingModuleId()
        cacheAsset(asset.name, index, moduleId, asset.type)
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
    getModuleIdByName: getAssetModuleIdByName,
    getModuleIdByIndex: getAssetModuleIdByIndex,
    getTypesByName: getAssetTypesByName,
    getTypesByIndex: getAssetTypesByIndex,
    setDefaultPreferredType: setDefaultPreferredAssetType,
}

export type AssetsLibrary = typeof AssetsLibrary

export function registerCustomAsset(asset: Pick<PackagerAsset, 'width' | 'height' | 'type' | 'name'>, source: string) {
    // TODO: Support multiple custom assets with the same name

    if (asset.name in customAssets)
        throw new Error(
            'Custom asset with the same name already exists, and registering multiple custom assets with the same name is not supported yet',
        )

    return (customAssets[asset.name] = assetsRegistry.registerAsset({
        ...asset,
        __packager_asset: true,
        scales: [1],
        [CustomAssetBrandKey]: source,
        hash: '',
        httpServerLocation: `/(custom)/${asset.name}.${asset.type}`,
    } as PackagerAsset))
}

/**
 * Returns whether the asset is a custom asset, registered by a plugin
 * @param asset The asset to check
 * @returns Whether the asset is a custom asset
 */
export function isCustomAsset(asset: PackagerAsset): asset is CustomAsset {
    return CustomAssetBrandKey in asset
}

/**
 * Returns the asset tied to the given name
 * @param name The name of the asset
 * @returns The asset tied to the name
 */
export function getAssetByName(name: string, preferredType: PackagerAsset['type'] = defaultPreferredType) {
    if (name in customAssets) return getAssetByIndex(customAssets[name]!)
    return getAssetByIndex(getAssetIndexByName(name, preferredType)!)
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
 * Returns the preferred asset index tied to given name
 * @param name The name of the asset
 * @param preferredType The preferred asset type
 * @returns The preferred asset index tied to the name
 */
export function getAssetIndexByName(name: string, preferredType: PackagerAsset['type'] = defaultPreferredType) {
    if (name in customAssets) return customAssets[name]

    const assetModule = cache.assetModules[name]
    if (!assetModule) return

    const mid = assetModule[preferredType] ?? assetModule[getFirstRegisteredAssetTypeByName(name)!]
    if (typeof mid === 'undefined') return

    return requireModule(mid)
}

/**
 * Returns the asset's registrar module ID tied to the given asset name
 * @param name The name of the asset
 * @param preferredType The preferred asset type
 * @returns The asset's registrar module ID
 */
export function getAssetModuleIdByName(name: string, preferredType: PackagerAsset['type'] = defaultPreferredType) {
    const moduleIds = cache.assetModules[name]
    if (!moduleIds) return
    return moduleIds[preferredType] ?? moduleIds[getFirstRegisteredAssetTypeByName(name)!]
}

/**
 * Returns the asset's registrar module ID tied to the given asset index
 * @param index The index of the asset
 * @returns The asset's registrar module ID
 */
export function getAssetModuleIdByIndex(index: number) {
    return cache.assetModules[assetCacheIndexSymbol][index]
}

/**
 * Returns the preferred asset's types tied to the given asset name
 * @param name The name of the asset
 * @param preferredType The preferred asset type
 * @returns The preferred asset's types tied to the name
 */
export function getAssetTypesByName(name: string, preferredType: PackagerAsset['type'] = defaultPreferredType) {
    return getAssetTypesByIndex(getAssetIndexByName(name, preferredType)!)
}

/**
 * Returns the asset's types tied to the given asset index
 * @param index The index of the asset
 * @returns The asset's types tied to the index
 */
export function getAssetTypesByIndex(index: number) {
    return Object.keys(cache.assetModules[assetCacheIndexSymbol][index] ?? {})
}

/**
 * Returns the first registered asset type tied to the given asset name
 * @param name The name of the asset
 * @returns The first registered asset type tied to the name
 */
export function getFirstRegisteredAssetTypeByName(name: string): PackagerAsset['type'] | undefined {
    return cache.assetModules[name]?.[FirstAssetTypeRegisteredKey]
}

/**
 * Sets the default preferred asset type
 * - Android: `svg`
 * - iOS: `png` (iOS cannot display SVGs natively)
 * @param type
 */
export function setDefaultPreferredAssetType(type: PackagerAsset['type']) {
    defaultPreferredType = type
}
