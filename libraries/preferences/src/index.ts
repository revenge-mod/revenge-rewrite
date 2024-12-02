import { createStorage } from '@revenge-mod/storage'

export interface Settings {
    safeMode: {
        enabled: boolean
        enabledNextLaunch: boolean
    }
}

export type PluginStates = Record<string, { enabled: boolean; errors: SerializedPluginError[] }>

export type SerializedPluginError = {
    name: string,
    message: string,
    stack: string,
}

export const settings = createStorage<Settings>('revenge/settings.json', {
    initial: {
        safeMode: {
            enabled: false,
            enabledNextLaunch: false,
        },
    },
})

export const pluginsStates = createStorage<PluginStates>(
    'revenge/plugins/states.json',
    {
        initial: {},
    },
)
