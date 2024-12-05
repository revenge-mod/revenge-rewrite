import { PluginsStatesFilePath, SettingsFilePath } from '@revenge-mod/shared/paths'
import { createStorage } from '@revenge-mod/storage'

export interface Settings {
    safeMode: {
        enabled: boolean
        enabledNextLaunch: boolean
    }
}

export type PluginStates = Record<string, { enabled: boolean; errors: SerializedPluginError[] }>

export type SerializedPluginError = {
    name: string
    message: string
    stack: string
}

export const settings = createStorage<Settings>(SettingsFilePath, {
    initial: {
        safeMode: {
            enabled: false,
            enabledNextLaunch: false,
        },
    },
})

export const pluginsStates = createStorage<PluginStates>(PluginsStatesFilePath, {
    initial: {},
})
