import { MetroModuleFilePathKey } from '@revenge-mod/modules/constants'
import {
    blacklistModule,
    cache,
    getImportingModuleId,
    isModuleBlacklisted,
    subscribeModule,
} from '@revenge-mod/modules/metro'
import { noop, noopPromise } from '@revenge-mod/utils/functions'

import type { Patcher } from '@revenge-mod/patcher'
import type { LibraryLogger } from '@revenge-mod/utils/library'
import type { Metro } from '../types'

/**
 * Schedules patches for Metro modules
 * @param patcher A patcher instance
 * @param logger A logger instance
 * @param metroModules Metro modules list
 */
export function initializeModulePatches(patcher: Patcher, logger: LibraryLogger, metroModules: typeof modules) {
    // Tracks file path so findByFilePath works
    subscribePatchableModule(
        'f',
        exports => exports.fileFinishedImporting,
        exports => {
            patcher.before(
                exports,
                'fileFinishedImporting',
                ([filePath]) => {
                    const importingModuleId = getImportingModuleId()
                    if (importingModuleId === -1 || !filePath) return
                    metroModules[importingModuleId]![MetroModuleFilePathKey] = filePath as string
                },
                'trackFilePath',
            )
        },
    )

    // Stops the module from registering the same native component twice
    subscribePatchableModule(
        'r',
        exports => ['customBubblingEventTypes', 'customDirectEventTypes', 'register', 'get'].every(x => exports[x]),
        exports => {
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
        },
    )

    // Stops the freezing on initialized module from starting up
    subscribePatchableModule(
        'b',
        (exports, id) => {
            // The module before cannot get initialized without causing a freeze
            // [NativeStartupFlagsModule, (Problematic), (OtherModule)]
            // We are gonna patch: NativeStartupFlagsModule
            return exports.default?.reactProfilingEnabled && !metroModules[id + 1]?.publicModule.exports.default
        },
        (_, id) => {
            // So we just blacklist it here
            if (!isModuleBlacklisted(id + 1)) {
                blacklistModule(id + 1)
                logger.log(`Blacklisted module ${id + 1} as it causes freeze when initialized`)
            }
        },
    )

    // Blocks Sentry
    subscribePatchableModule(
        's',
        m => m.initSentry,
        m => (m.initSentry = noop),
    )

    // Blocks Discord analytics
    subscribePatchableModule(
        'd',
        m => m.default?.track && m.default.trackMaker,
        m => (m.default.track = () => noopPromise),
    )
}

function subscribePatchableModule(
    patchId: keyof (typeof cache)['patchableModules'],
    filter: (exports: Metro.ModuleExports, id: Metro.ModuleID) => boolean,
    patch: (exports: Metro.ModuleExports, id: Metro.ModuleID) => unknown,
) {
    const cachedId = cache.patchableModules[patchId]
    const unsub = cachedId
        ? subscribeModule(cachedId, exports => {
              unsub()
              patch(exports, cachedId)
          })
        : subscribeModule.all((id, exports) => {
              if (!filter(exports, id)) return
              unsub()
              cache.patchableModules[patchId] = id
              patch(exports, id)
          })
}
