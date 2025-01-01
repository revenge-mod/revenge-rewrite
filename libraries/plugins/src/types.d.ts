import type { Patcher } from '@revenge-mod/patcher'
import type { RevengeLibrary } from '@revenge-mod/revenge'
import type { ExtendedObservable } from '@revenge-mod/storage'
import type React from 'react'

import type { Metro } from '@revenge-mod/modules'
import type { WhitelistedPluginObjectKeys } from './constants'
import type { InternalPluginDefinition } from './internals'

export type PluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn> = {
    /**
     * Runs before the app gets rendered AND even before the plugin is refetched and updated.
     * If your plugin receives a new update, your old version will continue to run until the user decides to reload the app.
     * @param context The context for this lifecycle
     * @returns An additional context to give to the next lifecycles
     */
    beforeAppRender?: (
        context: PluginContext<'BeforeAppRender', Storage, AppLaunchedReturn, AppInitializedReturn>,
    ) => Promise<AppInitializedReturn> | AppInitializedReturn
    /**
     * Runs after the app gets rendered.
     * @param context The context for this lifecycle
     * @returns An additional context to give to the next lifecyles
     */
    afterAppRender?: (
        context: PluginContext<'AfterAppRender', Storage, AppLaunchedReturn, AppInitializedReturn>,
    ) => Promise<AppLaunchedReturn> | AppLaunchedReturn
    /**
     * Runs before your plugin is stopped
     * @param context The context for this lifecycle
     */
    beforeStop?: (context: PluginContext<'BeforeStop', Storage, AppLaunchedReturn, AppInitializedReturn>) =>
        | {
              reloadRequired?: boolean
          }
        | undefined
        | void
    onMetroModuleLoad?: (
        context: PluginContext<'BeforeAppRender', Storage, AppLaunchedReturn, AppInitializedReturn>,
        moduleId: Metro.ModuleID,
        moduleExports: Metro.ModuleExports,
        unsubscribeAll: () => boolean,
    ) => void
} & {
    settings?: React.FC<PluginContext<'AfterAppRender', Storage, AppLaunchedReturn, AppInitializedReturn>>
    initializeStorage?: () => Storage
}

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
        beforeAppRender: Stage extends 'Starting' ? null : AppLaunchedReturn
        afterAppRender: Stage extends 'BeforeAppRender' ? AppInitializedReturn : null
    }
    /**
     * Schedules callbacks to be run when the plugin is stopped
     * @param cleanups Cleanup functions to add
     */
    cleanup(...cleanups: [PluginCleanupFunction, ...PluginCleanupFunction[]]): void
}
