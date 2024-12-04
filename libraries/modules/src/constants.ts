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
 * The safe amount of modules to hook instantly before deferring to hook later.
 * Lowering this may cause issues like not being able to blacklist a problematic module in time.
 * Setting this too high will result in a noticably slower startup time, especially on lower end devices.
 */
export const SafeModuleHookAmountBeforeDefer = 1500

/**
 * The Metro cache version
 */
export const MetroCacheVersion = 2

/**
 * The storage key for the Metro cache
 */
export const MetroCacheKey = 'RevengeMetroCache'

/**
 * The key for a module's file path (using a symbol does not work for some reason)
 */
export const MetroModuleFilePathKey = '__moduleFilePath'

/**
 * The key for an asset's first registered type
 */
export const FirstAssetTypeRegisteredKey = '__firstTypeRegistered'

/**
 * The symbol to access asset caches using indexes instead of names
 */
export const assetCacheIndexSymbol = Symbol.for('revenge.modules.metro.caches.assetCacheIndex')
