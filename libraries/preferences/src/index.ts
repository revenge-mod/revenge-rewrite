import { createStorage } from '@revenge-mod/storage'

export interface Settings {
    safeMode?: {
        enabled: boolean
        enabledNextLaunch: boolean
    }
    developerSettingsEnabled: boolean
    willBeMoved_staffSettingsEnabled: boolean
}

export const settings = createStorage<Settings>('revenge/settings.json', {
    initial: {
        safeMode: {
            enabled: false,
            enabledNextLaunch: false,
        },
        developerSettingsEnabled: false,
        willBeMoved_staffSettingsEnabled: false,
    },
})

// const plugins = createStorage<Record<string, { url: string, enabled: boolean }>>('revenge/plugins.json', {
//     initial: {},
// })
