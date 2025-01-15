import { noop, noopPromise } from '@revenge-mod/utils/functions'

import {
    blacklistModule,
    getImportingModuleId,
    afterModuleInitialized,
} from '.'

import { cache } from './caches'
import { logger } from '../shared'

// Tracks file path so find(byFilePath(...)) works
const uFFIT = afterModuleInitialized((_, m) => {
    if (m.fileFinishedImporting) {
        const origFFI = m.fileFinishedImporting

        m.fileFinishedImporting = (filePath: string) => {
            const id = getImportingModuleId()
            if (!filePath || id === -1) return
            cache.moduleFilePaths.set(filePath, id)
            origFFI(filePath)
        }

        uFFIT()
    }
})

// Stops the freezing on initialized module from starting up:
// The module before cannot get initialized without causing a freeze
// [NativeStartupFlagsModule, (Problematic), (OtherModule)]
// We are gonna looking for NativeStartupFlagsModule to blacklist the problematic module
const uBPM = afterModuleInitialized((id, m) => {
    if (m.default?.reactProfilingEnabled && !modules.get(id + 1)!.isInitialized) {
        blacklistModule(id + 1)
        logger.log(`Blacklisted module ${id + 1} as it causes freeze when initialized`)
        uBPM()
    }
})

// Stops the module from registering the same native component twice
const uNCRF = afterModuleInitialized((_, m) => {
    if (m.customBubblingEventTypes) {
        const origReg = m.register
        m.register = (...args: unknown[]) => {
            try {
                return origReg(...args)
            } catch {}
        }

        uNCRF()
    }
})

// Block Sentry
const uBS = afterModuleInitialized((_, m) => {
    if (m.initSentry) m.initSentry = noop
    uBS()
})

// Block Discord analytics
const uBDA = afterModuleInitialized((_, m) => {
    if (m.default?.track && m.default.trackMaker) {
        m.default.track = () => noopPromise
        uBDA()
    }
})

// Moment locale fix
const uMLF = afterModuleInitialized((_, m) => {
    if (m.isMoment) {
        const origDfL = m.defineLocale

        m.defineLocale = (...args: unknown[]) => {
            const origLocale = m.locale()
            origDfL(...args)
            m.locale(origLocale)
        }

        uMLF()
    }
})
