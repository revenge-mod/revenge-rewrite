import { createBitFlagEnum } from '@revenge-mod/utils/enums'

/**
 * The module flags
 */
export const MetroModuleFlags = createBitFlagEnum('Blacklisted', 'Asset')

/**
 * The lookup registry flags
 */
export const MetroModuleLookupRegistryFlags = createBitFlagEnum('NotFound', 'FullLookup')

/**
 * The Metro cache version
 */
export const MetroCacheVersion = 4

/**
 * The storage key for the Metro cache
 */
export const MetroCacheRelativeFilePath = 'RevengeMetroCache'

/**
 * The key for the first asset type registered
 */
export const FirstAssetTypeRegisteredKey = '__ftr'

/**
 * The symbol to access asset caches using indexes instead of names
 */
export const assetCacheIndexSymbol = Symbol.for('revenge.modules.metro.caches.assetCacheIndex')
