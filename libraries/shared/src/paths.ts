const BaseDirectory = 'revenge'

export const SettingsFilePath = `${BaseDirectory}/settings.json`

export const TrustedKeysDirectoryPath = `${BaseDirectory}/trusted_keys`
export const TrustedKeysDataFilePath = `${TrustedKeysDirectoryPath}/data.json`

export const PluginsDirectoryPath = `${BaseDirectory}/plugins`
export const PluginsStatesFilePath = `${PluginsDirectoryPath}/states.json`
export const PluginStoragePath = (id: string) => `${PluginsDirectoryPath}/${id}/storage.json`
