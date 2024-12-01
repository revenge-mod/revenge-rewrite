import { afterAppRender } from '@revenge-mod/app'
import { getErrorStack } from '@revenge-mod/utils/errors'

import { appRenderedCallbacks, corePluginIds, plugins, registerPlugin } from './internals'
import { logger } from './shared'

import type { PluginDefinition, PluginStorage } from './types'

export type * from './types'

afterAppRender(() => {
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
    logger.info('Starting core plugins lifecycles...')

    const promises: Promise<unknown>[] = []
    const errors: AggregateError[] = []

    for (const id of corePluginIds) {
        const plugin = plugins[id]!
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
    logger.info('Starting Metro module subscriptions for plugins...')
    for (const plugin of Object.values(plugins)) plugin.startMetroModuleSubscriptions!()
}

export type PluginsLibrary = typeof PluginsLibrary
