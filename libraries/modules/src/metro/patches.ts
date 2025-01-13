import { createPatcherInstance } from '@revenge-mod/patcher'
import { noop, noopPromise } from '@revenge-mod/utils/functions'

import { blacklistModule, getImportingModuleId, isModuleBlacklisted, subscribeModule } from '.'

import { cache } from './caches'
import { logger } from '../shared'

import type { Metro } from '../types'

const patcher = createPatcherInstance('revenge.library.modules.metro.patches')

// Tracks file path so find(byFilePath(...)) works
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
                cache.moduleFilePaths.set(importingModuleId, filePath)
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
        return exports.default?.reactProfilingEnabled && !modules.get(id + 1)?.publicModule.exports.default
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

// Moment locale fix
subscribePatchableModule(
    'm',
    m => m.isMoment,
    moment =>
        patcher.instead(moment, 'defineLocale', (args, orig) => {
            const origLocale = moment.locale()
            orig(...args)
            moment.locale(origLocale)
        }),
)

function subscribePatchableModule(
    patchId: keyof (typeof cache)['patchableModules'],
    filter: (exports: Metro.ModuleExports, id: Metro.ModuleID) => boolean,
    patch: (exports: Metro.ModuleExports, id: Metro.ModuleID) => unknown,
) {
    const cachedId = cache.patchableModules[patchId]
    const unsub = cachedId
        ? subscribeModule(cachedId, exports => {
              patch(exports, cachedId)
          })
        : subscribeModule.all((id, exports) => {
              if (!filter(exports, id)) return
              unsub()

              cache.patchableModules[patchId] = id
              patch(exports, id)

              // Subscribe to the module again (this time it is cached)
              subscribePatchableModule(patchId, filter, patch)
          })
}
