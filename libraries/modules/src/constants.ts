import { createBitFlagEnum } from '@revenge-mod/utils/enums'

/**
 * The module flags
 */
export const MetroModuleFlags = createBitFlagEnum('Blacklisted', 'Asset')
/**
 * The module lookup flags
 */
export const MetroModuleLookupFlags = createBitFlagEnum('NotFound', 'FullLookup')

/**
 * The module ID for the index module
 */
export const IndexMetroModuleId = 0
/**
 * The Metro cache version
 */
export const MetroCacheVersion = 3

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
