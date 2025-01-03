import type { PluginManifest } from '@revenge-mod/plugins/schemas'
import { useMemo } from 'react'

export function useFilteredPlugins<const P extends PluginManifest & { external?: boolean; manageable?: boolean }>(
    plugins: P[],
    query: string,
    options: { showInternal: boolean; showUnmanageable: boolean },
) {
    const { showInternal } = options

    const _plugins = useMemo(
        () =>
            plugins.filter(
                plugin =>
                    plugin.name.toLowerCase().replaceAll(/\s/g, '').includes(query) ||
                    plugin.id.toLowerCase().includes(query),
            ),
        [plugins, query],
    )

    const externalPlugins = useMemo(
        () =>
            _plugins.filter(
                plugin => (plugin.external ?? true) && (!options.showUnmanageable ? (plugin.manageable ?? true) : true),
            ),
        [_plugins, options.showUnmanageable],
    )

    const internalPlugins = useMemo(
        () =>
            _plugins.filter(
                plugin =>
                    !(plugin.external ?? true) && (!options.showUnmanageable ? (plugin.manageable ?? true) : true),
            ),
        [_plugins, options.showUnmanageable],
    )

    const empty = !(showInternal ? internalPlugins.length + externalPlugins.length : externalPlugins.length)

    // TODO: Maybe create 2 separate data lists for non-filtered and filtered plugins
    const noSearchResults = empty && !!query

    return { plugins: _plugins, externalPlugins, internalPlugins, empty, noSearchResults }
}
