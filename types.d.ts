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

    /**
     * Calls the garbage collector
     */
    const gc: () => void
    const ErrorUtils: RNErrorUtils
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
