import type { AppLibrary } from '@revenge-mod/app'
import type { AssetsLibrary } from '@revenge-mod/assets'
import type { DiscordModules, Metro, ModulesLibrary } from '@revenge-mod/modules'
import type { PluginLibrary, PluginsLibrary } from '@revenge-mod/plugins'
import type { SettingsUILibrary } from '@revenge-mod/ui/settings'
import type { ErrorUtils as RNErrorUtils } from 'react-native'
import type MessageQueue from 'react-native/Libraries/BatchedBridge/MessageQueue'

// All of these typings are exported, be careful what you export here!

declare global {
    var nativeModuleProxy: Record<string, unknown>
    var modules: Metro.ModuleList
    var __r: Metro.RequireFn
    var __c: Metro.ClearFn

    var revenge: RevengeLibrary

    var React: typeof import('react')
    var ReactNative: typeof import('react-native')
    const ErrorUtils: RNErrorUtils

    var performance: {
        now(): number
    }

    declare function setTimeout(cb: (...args: unknown[]) => unknown, timeout?: number): number
    /**
     * Calls the garbage collector
     */
    declare function gc(): void
    declare function alert(message: unknown): void
}

/**
 * The main library for Revenge
 */
export interface RevengeLibrary {
    /**
     * App related functions
     */
    app: AppLibrary
    /**
     * Assets related functions. Assets are resources packed into the app.
     */
    assets: AssetsLibrary
    /**
     * Metro related functions. Metro is the bundler used by React Native.
     * @see {@link https://metrobundler.dev/}
     */
    modules: ModulesLibrary
    plugins: PluginsLibrary
    ui: {
        settings: SettingsUILibrary
    }
    /** @internal */
    // TODO:
    // settings: typeof import('@revenge-mod/settings').default
}

export namespace ReactNativeInternals {
    namespace AssetsRegistry {
        // export type AssetDestPathResolver = 'android' | 'generic'

        export type PackagerAsset = {
            __packager_asset: boolean
            fileSystemLocation: string
            httpServerLocation: string
            width?: number
            height?: number
            scales: number[]
            hash: string
            name: string
            type: string
            // resolver?: AssetDestPathResolver
        }

        export function registerAsset(asset: PackagerAsset): number
        export function getAssetByID(assetId: number): PackagerAsset
    }
}

declare module '@revenge-mod/app' {
    export default typeof import('./libraries/app')
}

declare module '@revenge-mod/assets' {
    export default typeof import('./libraries/asset')
}

declare module '@revenge-mod/debug' {
    export default typeof import('./libraries/debug')
}

declare module '@revenge-mod/modules' {
    export default typeof import('./libraries/modules')
}

declare module '@revenge-mod/modules/common' {
    export default typeof import('./libraries/modules/src/common')
}

declare module '@revenge-mod/modules/common/components' {
    export default typeof import('./libraries/modules/src/common/components')
}

declare module '@revenge-mod/modules/constants' {
    export default typeof import('./libraries/modules/src/constants')
}

declare module '@revenge-mod/modules/filters' {
    export default typeof import('./libraries/modules/src/filters')
}

declare module '@revenge-mod/modules/metro' {
    export default typeof import('./libraries/modules/src/metro')
}

declare module '@revenge-mod/modules/native' {
    export default typeof import('./libraries/modules/src/native')
}

declare module '@revenge-mod/patcher' {
    export default typeof import('./libraries/patcher')
}

declare module '@revenge-mod/plugins' {
    export default typeof import('./libraries/plugins')
}

declare module '@revenge-mod/preferences' {
    export default typeof import('./libraries/preferences')
}

declare module '@revenge-mod/storage' {
    export default typeof import('./libraries/storage')
}

declare module 'events' {
    export default typeof import('./shims/events')
}
