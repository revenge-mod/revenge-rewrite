import { type InferOutput, function_, maxLength, minLength, object, optional, pipe, regex, string } from 'valibot'

import type { PluginContext } from './types'
import type { Metro } from '@revenge-mod/modules'
import type { FC } from 'react'

export const PluginManifestSchema = object({
    name: pipe(string(), minLength(1), maxLength(100)),
    description: pipe(string(), minLength(1), maxLength(500)),
    author: pipe(string(), minLength(1), maxLength(100)),
    id: pipe(string(), regex(/^[a-z0-9-_\.]{1,100}$/)),
    version: pipe(string(), minLength(1), maxLength(50)),
    icon: pipe(string(), minLength(1), maxLength(100)),
})

export type PluginManifest = InferOutput<typeof PluginManifestSchema>

export const PluginDefinitionSchema = object({
    beforeAppRender: optional(function_()),
    afterAppRender: optional(function_()),
    beforeStop: optional(function_()),
    onMetroModuleLoad: optional(function_()),
    SettingsComponent: optional(function_()),
    initializeStorage: optional(function_()),
})

// TODO: Check if types between schema and this match
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
    /**
     * Runs when a Metro module is loaded
     * @param context The context for this lifecycle
     * @param moduleId The module ID
     * @param moduleExports The module exports
     * @param unsubscribeAll A function to stop subscribing to Metro module loads
     */
    onMetroModuleLoad?: (
        context: PluginContext<'BeforeAppRender', Storage, AppLaunchedReturn, AppInitializedReturn>,
        moduleId: Metro.ModuleID,
        moduleExports: Metro.ModuleExports,
        unsubscribeAll: () => boolean,
    ) => void
    /**
     * Settings page for this plugin
     */
    SettingsComponent?: FC<PluginContext<'AfterAppRender', Storage, AppLaunchedReturn, AppInitializedReturn>>
    /**
     * A function to get the data to save when the plugin's storage is initially created
     * @returns The data to save
     */
    initializeStorage?: () => Storage
}
