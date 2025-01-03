import type { Buffer as _Buffer } from 'buffer'
import type { AppLibrary } from '@revenge-mod/app'
import type { AssetsLibrary } from '@revenge-mod/assets'
import type { DiscordModules, Metro, ModulesLibrary } from '@revenge-mod/modules'
import type { ReactJSXLibrary } from '@revenge-mod/react/jsx'
import type { SettingsUILibrary } from '@revenge-mod/ui/settings'
import type { ErrorUtils as RNErrorUtils } from 'react-native'
import type MessageQueue from 'react-native/Libraries/BatchedBridge/MessageQueue'

// All of these typings are exported, be careful what you export here!

declare global {
    var Buffer: typeof _Buffer

    var nativeModuleProxy: Record<string, unknown>
    var modules: Metro.ModuleList
    var __r: Metro.RequireFn
    var __c: Metro.ClearFn
    var nativePerformanceNow: typeof performance.now

    var revenge: RevengeLibrary

    var React: typeof import('react')
    var ReactNative: typeof import('react-native')

    var __REACT_DEVTOOLS_GLOBAL_HOOK__: unknown | undefined
    var __reactDevTools:
        | {
              version: string
              exports: {
                  connectToDevTools(opts: {
                      host?: string
                      port?: number
                      websocket?: WebSocket
                  }): void
              }
          }
        | undefined

    var globalEvalWithSourceUrl: (code: string, sourceURL: string) => any

    const ErrorUtils: RNErrorUtils

    var performance: {
        now(): number
    }

    declare function nativeLoggingHook(str: string, level: number): void

    declare function setTimeout(cb: (...args: unknown[]) => unknown, timeout?: number): number
    /**
     * Calls the garbage collector
     */
    declare function gc(): void
    declare function alert(message: unknown): void

    interface Promise {
        /// PROMISE POLYFILLS FROM: https://github.com/then/promise
        /// AND: https://github.com/facebook/hermes/blob/main/lib/InternalBytecode/01-Promise.js
        _h: 0 | 1 | 2
    }

    type HermesPromiseRejectionHandler = (promise: Promise<any>, error: any) => void

    interface PromiseConstructor {
        _m: HermesPromiseRejectionHandler
    }

    interface HermesInternalObject {
        getRuntimeProperties(): Record<string, string>
        // biome-ignore lint/complexity/noBannedTypes: Don't complain
        getFunctionLocation(fn: Function): {
            fileName: string
            lineNumber: number
            columnNumber: number
            segmentID: number
            virtualOffset: number
            isNative: boolean
        }
    }
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
    ui: {
        settings: SettingsUILibrary
        colors: typeof import('@revenge-mod/ui/colors')
    }
    react: {
        jsx: ReactJSXLibrary
    }
}

export namespace ReactNativeInternals {
    namespace AssetsRegistry {
        // export type AssetDestPathResolver = 'android' | 'generic'

        export type PackagerAsset = {
            __packager_asset: boolean
            fileSystemLocation?: string
            httpServerLocation?: string
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
    const app: typeof import('./libraries/app')
    export * from './libraries/app'
    export default app
}

declare module '@revenge-mod/assets' {
    const assets: typeof import('./libraries/assets')
    export * from './libraries/assets'
    export default assets
}

declare module '@revenge-mod/debug' {
    const debug: typeof import('./libraries/debug')
    export * from './libraries/debug'
    export default debug
}

declare module '@revenge-mod/modules' {
    const modules: typeof import('./libraries/modules')
    export * from './libraries/modules'
    export default modules
}

declare module '@revenge-mod/modules/common' {
    const common: typeof import('./libraries/modules/src/common')
    export * from './libraries/modules/src/common'
    export default common
}

declare module '@revenge-mod/modules/common/components' {
    const components: typeof import('./libraries/modules/src/common/components')
    export * from './libraries/modules/src/common/components'
    export default components
}

declare module '@revenge-mod/modules/common/components/icons' {
    const icons: typeof import('./libraries/modules/src/common/components/icons')
    export * from './libraries/modules/src/common/components/icons'
    export default icons
}

declare module '@revenge-mod/modules/constants' {
    const constants: typeof import('./libraries/modules/src/constants')
    export * from './libraries/modules/src/constants'
    export default constants
}

declare module '@revenge-mod/modules/filters' {
    const filters: typeof import('./libraries/modules/src/filters')
    export * from './libraries/modules/src/filters'
    export default filters
}

declare module '@revenge-mod/modules/metro' {
    const metro: typeof import('./libraries/modules/src/metro')
    export * from './libraries/modules/src/metro'
    export default metro
}

declare module '@revenge-mod/modules/native' {
    const native: typeof import('./libraries/modules/src/native')
    export * from './libraries/modules/src/native'
    export default native
}

declare module '@revenge-mod/patcher' {
    const patcher: typeof import('./libraries/patcher')
    export * from './libraries/patcher'
    export default patcher
}

declare module '@revenge-mod/plugins' {
    const plugins: typeof import('./libraries/plugins')
    export * from './libraries/plugins'
    export default plugins
}

declare module '@revenge-mod/plugins/internals' {
    const internals: typeof import('./libraries/plugins/src/internals')
    export * from './libraries/plugins/src/internals'
    export default internals
}

declare module '@revenge-mod/plugins/constants' {
    const constants: typeof import('./libraries/plugins/src/constants')
    export * from './libraries/plugins/src/constants'
    export default constants
}

declare module '@revenge-mod/plugins/schemas' {
    const schemas: typeof import('./libraries/plugins/src/schemas')
    export * from './libraries/plugins/src/schemas'
    export default schemas
}

declare module '@revenge-mod/storage' {
    const storage: typeof import('./libraries/storage')
    export * from './libraries/storage'
    export default storage
}

declare module 'events' {
    const events: typeof import('./shims/events')
    export * from './shims/events'
    export default events
}

declare module '@revenge-mod/ui/colors' {
    const uiColors: typeof import('./libraries/ui/src/colors')
    export * from './libraries/ui/src/colors'
    export default uiColors
}

declare module '@revenge-mod/ui/components' {
    const uiComponents: typeof import('./libraries/ui/src/components')
    export * from './libraries/ui/src/components'
    export default uiComponents
}

declare module '@revenge-mod/ui/settings' {
    const settingsUI: typeof import('./libraries/ui/src/settings')
    export * from './libraries/ui/src/settings'
    export default settingsUI
}

declare module '@revenge-mod/react/jsx' {
    const reactJSX: typeof import('./libraries/react/src/jsx')
    export * from './libraries/react/src/jsx'
    export default reactJSX
}
