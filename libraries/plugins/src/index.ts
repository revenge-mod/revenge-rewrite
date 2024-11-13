import type { Patcher } from '@revenge-mod/patcher'
import type { RevengeLibrary } from '@revenge-mod/revenge'
import { internalSymbol } from '@revenge-mod/shared/symbols'
import Libraries from '@revenge-mod/utils/library'
import type React from 'react'
import {
    type InternalPluginDefinition,
    type WhitelistedPluginObjectKeys,
    appInitCallbacks,
    corePluginIds,
    plugins,
    registerPlugin,
} from './internals'
import { app } from './shared'
import type { ExtendedObservable } from '@revenge-mod/storage'

export const PluginsLibrary = Libraries.create(
    {
        name: 'plugins',
        uses: [],
    },
    () => {
        app.afterInitialized(() => {
            for (const cb of appInitCallbacks) cb()
        })

        return {
            definePlugin,
            [internalSymbol]: {
                plugins,
                async startCorePlugins() {
                    for (const id of corePluginIds) {
                        try {
                            const plugin = plugins.get(id)!
                            // In case predicate returned false
                            if (plugin.enabled) await plugin.start()
                        } catch (e) {
                            throw new Error(`Core plugin "${id}" had an error while starting`, { cause: e })
                        }
                    }

                },
            },
        }
    },
)

export type PluginsLibrary = ReturnType<(typeof PluginsLibrary)['new']>

/**
 * Defines a plugin
 * @param definition The plugin definition
 * @returns The plugin object
 */
function definePlugin<Storage = PluginStorage, AppLaunchedReturn = void, AppInitializedReturn = void>(
    definition: PluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn>,
) {
    return registerPlugin(definition)
}

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
    // TODO: Support plugin dependencies with proper typings
    // dependencies: Record<string, PluginDependency>

    beforeAppRender?: (
        context: PluginContext<'Starting', Storage, AppLaunchedReturn, AppInitializedReturn>,
    ) => Promise<AppInitializedReturn> | AppInitializedReturn
    afterAppRender?: (
        context: PluginContext<'BeforeAppRender', Storage, AppLaunchedReturn, AppInitializedReturn>,
    ) => Promise<AppLaunchedReturn> | AppLaunchedReturn
    onStop?: (
        context: PluginContext<'AfterAppRender', Storage, AppLaunchedReturn, AppInitializedReturn>,
    ) => unknown
} & {
    //   } //       settings: PluginSettingSchema // | { // TODO: Support plugin defined settings with proper typings
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
