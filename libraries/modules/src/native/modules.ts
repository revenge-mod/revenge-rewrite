import { lazyValue } from '@revenge-mod/utils/lazy'
import type { DiscordNativeModules } from './types'

/**
 * Naming conventions:
 * - Always use the most recent module name (if we can do it in a non-breaking way)
 * - If the module name starts with "Native", remove it
 * - If the module name starts with "RTN", remove it
 * - If the module name ends with "Module", include it
 * - If the module name ends with "Manager", include it
 */

const nmp = window.nativeModuleProxy

export const CacheModule = lazyValue(() => nmp.NativeCacheModule ?? nmp.MMKVManager) as DiscordNativeModules.CacheModule
export const FileModule = lazyValue(() => nmp.NativeFileModule ?? nmp.RTNFileManager ?? nmp.DCDFileManager) as DiscordNativeModules.FileModule
export const ClientInfoModule = lazyValue(
    () => nmp.NativeClientInfoModule ?? nmp.RTNClientInfoManager ?? nmp.InfoDictionaryManager,
) as DiscordNativeModules.ClientInfoModule
export const DeviceModule = lazyValue(
    () => nmp.NativeDeviceModule ?? nmp.RTNDeviceManager ?? nmp.DCDDeviceManager,
) as DiscordNativeModules.DeviceModule

export const BundleUpdaterManager = lazyValue(
    () => nmp.BundleUpdaterManager,
) as DiscordNativeModules.BundleUpdaterManager

export const ThemeModule = lazyValue(
    () => nmp.NativeThemeModule ?? nmp.RTNThemeManager ?? nmp.DCDThemeManager,
) as DiscordNativeModules.ThemeModule
