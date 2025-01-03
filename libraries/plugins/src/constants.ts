import type { InternalPluginDefinition } from './internals'
import type { PluginStopConfig } from './types'

/**
 * The keys that plugins are allowed to access in the plugin object
 */
export const WhitelistedPluginObjectKeys = [
    'description',
    'disable',
    'icon',
    'id',
    'name',
    'version',
    'stop',
    'author',
    'errors',
] as const satisfies ReadonlyArray<keyof InternalPluginDefinition<any, any, any>>

export const DefaultPluginStopConfig: Required<PluginStopConfig> = {
    reloadRequired: false,
}

export const PluginStatus = {
    Stopped: 0,
    Fetching: 1,
    Starting: 2,
    Started: 3,
}

export type PluginStatus = (typeof PluginStatus)[keyof typeof PluginStatus]

export const PluginZipFileSizeLimit = 16 * 1024 * 1024 // 16 MB

export const InstallPluginResult = {
    Success: 0,
    AlreadyInstalled: 1,
    InvalidManifest: 2,
    InvalidFileFormat: 10,
    InvalidKeyFileFormat: 11,
    InvalidSignatureFileFormat: 12,
    SignatureVerificationFailed: 20,
    KeyNoValidity: 21,
    KeyRevoked: 22,
    PluginUnsigned: 23,
} as const

export type PluginInstallResult = (typeof InstallPluginResult)[keyof typeof InstallPluginResult]
