import { createBitFlagEnum } from '@revenge-mod/utils/enums'
import { logger, patcher } from '../shared'
import { blacklistModule, getImportingModuleId, getMetroModules, isModuleBlacklisted } from './index'

import type { Metro } from '../types'

let status = 0

/**
 * Gets a BitFlag enum that keeps track of which patches have been applied
 */
export const getStatus = () => status

/**
 * The key for a module's file path (using a symbol does not work for some reason)
 */
export const metroModuleFilePathKey = '__moduleFilePath'

/**
 * Gets whether a patch has been applied or not
 * @param patch The patch to check
 * @returns A positive integer, `0` means patched not applied, any other integer means patch was applied
 */
export function getPatchStatus(patch: keyof typeof MetroPatcherPatches) {
    return status & MetroPatcherPatches[patch]
}

/**
 * Patches a module if needed
 * @param exports The exports of the module
 * @param id The module ID
 */
export function patchModuleOnLoad(exports: Metro.ModuleExports, id: Metro.ModuleID) {
    if (!getPatchStatus('TrackFilePath') && exports.fileFinishedImporting) {
        patcher.before(
            exports,
            'fileFinishedImporting',
            ([filePath]) => {
                const importingModuleId = getImportingModuleId()
                if (importingModuleId === -1 || !filePath) return
                getMetroModules()[importingModuleId]![metroModuleFilePathKey] = filePath as string
            },
            'trackFilePath',
        )
        status |= MetroPatcherPatches.TrackFilePath
    }

    // There are modules registering the same native component
    if (
        !getPatchStatus('FixNativeComponentRegistryDuplicateRegister') &&
        ['customBubblingEventTypes', 'customDirectEventTypes', 'register', 'get'].every(x => exports[x])
    ) {
        patcher.instead(
            exports,
            'register',
            (args, origFunc) => {
                try {
                    return origFunc(...args)
                } catch {}
            },
            'fixNativeComponentRegistryDuplicateRegister',
        )

        status |= MetroPatcherPatches.FixNativeComponentRegistryDuplicateRegister
    }

    // The module before cannot get initialized without causing a freeze
    // [NativeStartupFlagsModule, (Problematic), (OtherModule)]
    // We are gonna patch: NativeStartupFlagsModule
    if (!getPatchStatus('BlacklistedFreezingModule') && exports.default?.reactProfilingEnabled) {
        const problematicModule = getMetroModules()[id + 1]

        // So we just blacklist it here
        if (!problematicModule?.publicModule.exports.default) {
            if (!isModuleBlacklisted(id + 1)) {
                blacklistModule(id + 1)
                status |= MetroPatcherPatches.BlacklistedFreezingModule
                logger.log(`Blacklisted module ${id + 1} as it causes freeze when initialized`)
            }
        }
    }

    // Prevent tracking
    exports.initSentry &&= () => void (status |= MetroPatcherPatches.DisableSentry)
    if (exports.default?.track && exports.default.trackMaker)
        exports.default.track = () => Promise.resolve(void (status |= MetroPatcherPatches.DisableTracking))

    // Prevent jank stats tracking (Android only)
    exports.startTracking &&= () => void (status |= MetroPatcherPatches.DisableJankStatsTracking)
}

/**
 * A BitFlag enum to keep track of which patches have been applied
 */
export const MetroPatcherPatches = createBitFlagEnum(
    'DisableSentry',
    'DisableJankStatsTracking',
    'DisableTracking',
    'FixNativeComponentRegistryDuplicateRegister',
    'TrackFilePath',
    'FixMomentLocale',
    'BlacklistedFreezingModule',
)
