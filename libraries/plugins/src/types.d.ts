import type { Patcher } from '@revenge-mod/patcher'
import type { RevengeLibrary } from '@revenge-mod/revenge'
import type { ExtendedObservable } from '@revenge-mod/storage'
import type { Metro } from '@revenge-mod/modules'

import type { WhitelistedPluginObjectKeys } from './constants'
import type { InternalPluginDefinition } from './internals'

export type PluginStopConfig = {
    /**
     * Whether a reload should be done after the plugin is stopped. The user will be prompted to reload the app, but they can dismiss it.
     */
    reloadRequired?: boolean
}

export type PluginStage = 'BeforeAppRender' | 'AfterAppRender' | 'BeforeStop'

export type PluginStorage = Record<string, any>

export type PluginCleanupFunction = () => unknown

export type PluginModuleSubscriptionContext<Storage = PluginStorage> = Pick<
    PluginContext<'BeforeAppRender', Storage, null, null>,
    'revenge' | 'plugin' | 'patcher' | 'cleanup' | 'storage'
>

export type PluginContext<
    Stage extends PluginStage = PluginStage,
    Storage = any,
    AppLaunchedReturn = any,
    AppInitializedReturn = any,
> = {
    revenge: RevengeLibrary
    /**
     * The plugin definition
     */
    plugin: Pick<
        InternalPluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn>,
        (typeof WhitelistedPluginObjectKeys)[number]
    >
    /**
     * The patcher instance for the plugin
     */
    patcher: Patcher
    /**
     * The plugin storage
     */
    storage: Storage & ExtendedObservable
    /**
     * The error that caused the plugin to stop
     */
    error?: any
    /**
     * Additional data returned from callbacks
     */
    context: {
        beforeAppRender: Stage extends 'Starting' ? null : Awaited<AppLaunchedReturn>
        afterAppRender: Stage extends 'BeforeAppRender' ? Awaited<AppInitializedReturn> : null
    }
    /**
     * Schedules callbacks to be run when the plugin is stopped
     * @param cleanups Cleanup functions to add
     */
    cleanup(...cleanups: [PluginCleanupFunction, ...PluginCleanupFunction[]]): void
}
