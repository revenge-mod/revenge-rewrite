import { afterAppRendered } from '@revenge-mod/app'
import { appRenderedCallbacks, corePluginIds, plugins, registerPlugin } from './internals'

import type { PluginDefinition, PluginStorage } from './types'
import { logger } from './shared'
import { getErrorStack } from '@revenge-mod/utils/errors'

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
    return registerPlugin(definition)
}

/**
 * Starts the lifecycles of core plugins. **Errors are only thrown for unqueued lifecycles like `beforeAppRender`.**
 * @internal
 */
export function startCorePlugins() {
    logger.log('Starting core plugins lifecycles...')

    const promises: Promise<unknown>[] = []
    const errors: AggregateError[] = []

    for (const id of corePluginIds) {
        const plugin = plugins.get(id)!
        // In case predicate returned false
        if (!plugin.enabled) continue
        promises.push(plugin.start!().catch(e => errors.push(e)))
    }

    return new Promise<void>((resolve, reject) => {
        Promise.all(promises)
            .then(() =>
                errors.length
                    ? reject(
                          new AggregateError(
                              errors,
                              `${errors.length} core plugins encountered errors:\n${errors.map(getErrorStack).join('\n')}`,
                          ),
                      )
                    : resolve(),
            )
            .catch(reject)
    })
}

export function startPluginsMetroModuleSubscriptions() {
    logger.log('Starting Metro module subscriptions for plugins...')
    for (const plugin of plugins.values()) plugin.startMetroModuleSubscriptions!()
}

export type PluginsLibrary = typeof PluginsLibrary
