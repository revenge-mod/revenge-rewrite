import { createBitFlagEnum } from '@revenge-mod/utils/enums'

/**
 * The module flags
 */
export const MetroModuleFlags = createBitFlagEnum('Exists', 'Blacklisted')
/**
 * The module lookup flags
 */
export const MetroModuleLookupFlags = createBitFlagEnum('NotFound')

/**
 * The module ID for the index module
 */
export const IndexMetroModuleId = 0
