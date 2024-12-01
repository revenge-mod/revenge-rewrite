import { createStorage } from '@revenge-mod/storage'

export interface Settings {
    safeMode: {
        enabled: boolean
        enabledNextLaunch: boolean
    }
}

export const settings = createStorage<Settings>('revenge/settings.json', {
    initial: {
        safeMode: {
            enabled: false,
            enabledNextLaunch: false,
        },
    },
})

export const pluginsStates = createStorage<Record<string, { enabled: boolean }>>('revenge/plugins/states.json', {
    initial: {},
})
