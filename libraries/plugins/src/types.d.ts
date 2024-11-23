import type { Patcher } from '@revenge-mod/patcher'
import type { RevengeLibrary } from '@revenge-mod/revenge'
import type { ExtendedObservable } from '@revenge-mod/storage'
import type React from 'react'

import type { InternalPluginDefinition, WhitelistedPluginObjectKeys } from './internals'

export type PluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn> = {
    /**
     * The friendly name of the plugin
     */
    name: string
    /**
     * The description of the plugin
     */
    description: string
    /**
     * The author of the plugin
     */
    author: string
    /**
     * The unique identifier of the plugin
     */
    id: string
    /**
     * The version of the plugin
     */
    version: string
    /**
     * The icon of the plugin
     */
    icon?: string

    /**
     * Runs before the app gets rendered AND even before the plugin is refetched and updated.
     * If your plugin receives a new update, your old version will continue to run until the user decides to reload the app.
     * @param context The context for this lifecycle
     * @returns An additional context to give to the next lifecycles
     */
    beforeAppRender?: (
        context: PluginContext<'Starting', Storage, AppLaunchedReturn, AppInitializedReturn>,
    ) => Promise<AppInitializedReturn> | AppInitializedReturn
    /**
     * Runs after the app gets rendered.
     * @param context The context for this lifecycle
     * @returns An additional context to give to the next lifecyles
     */
    afterAppRender?: (
        context: PluginContext<'BeforeAppRender', Storage, AppLaunchedReturn, AppInitializedReturn>,
    ) => Promise<AppLaunchedReturn> | AppLaunchedReturn
    /**
     * Runs before your plugin is stopped
     * @param context The context for this lifecycle
     */
    beforeStop?: (context: PluginContext<'AfterAppRender', Storage, AppLaunchedReturn, AppInitializedReturn>) => unknown
} & {
    settings?: React.FC<PluginContext<'AfterAppRender', Storage, AppLaunchedReturn, AppInitializedReturn>>
    initializeStorage?: () => Storage
}

export type PluginStage = 'Starting' | 'BeforeAppRender' | 'AfterAppRender'

// biome-ignore lint/suspicious/noExplicitAny: Anything can be in storage
export type PluginStorage = Record<string, any>

export type PluginCleanupFunction = () => unknown

export type PluginContext<
    Stage extends PluginStage,
    Storage = PluginStorage,
    AppLaunchedReturn = void,
    AppInitializedReturn = void,
> = {
    revenge: RevengeLibrary
    /**
     * The plugin definition
     */
    plugin: Pick<InternalPluginDefinition, (typeof WhitelistedPluginObjectKeys)[number]>
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

    // biome-ignore lint/suspicious/noExplicitAny: Errors can be anything
    error?: any
    /**
     * Additional data returned from callbacks
     */
    context: {
        beforeAppRender: Stage extends 'Starting' ? null : AppLaunchedReturn
        afterAppRender: Stage extends 'AfterAppRender' ? AppInitializedReturn : null
    }
    /**
     * Schedules callbacks to be run when the plugin is stopped
     * @param cleanups Cleanup functions to add
     */
    cleanup(...cleanups: [PluginCleanupFunction, ...PluginCleanupFunction[]]): void
}
