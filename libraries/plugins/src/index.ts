import { afterAppRendered } from '@revenge-mod/app'
import { appRenderedCallbacks, corePluginIds, plugins, registerPlugin } from './internals'

import type { PluginDefinition, PluginStorage } from './types'

export type * from './types'

afterAppRendered(() => {
    for (const cb of appRenderedCallbacks) cb()
})

export const PluginsLibrary = {
    /**
     * Defines a plugin
     * @param definition The plugin definition
     * @returns The plugin object
     */
    definePlugin,
}

export function definePlugin<Storage = PluginStorage, AppLaunchedReturn = void, AppInitializedReturn = void>(
    definition: PluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn>,
) {
    // @ts-expect-error: TODO
    return registerPlugin(definition)
}

export async function startCorePlugins() {
    const promises: Promise<unknown>[] = []

    for (const id of corePluginIds) {
        try {
            const plugin = plugins.get(id)!
            // In case predicate returned false
            if (plugin.enabled) promises.push(plugin.start())
        } catch (e) {
            throw new Error(`Core plugin "${id}" had an error while starting`, { cause: e })
        }
    }

    return void (await Promise.all(promises))
}

export function startCorePluginsMetroModuleSubscriptions() {
    for (const plugin of plugins.values()) plugin.startMetroModuleSubscriptions()
}

export type PluginsLibrary = typeof PluginsLibrary
