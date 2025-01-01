import type { PluginManifest } from '@revenge-mod/plugins/schemas'
import { useMemo } from 'react'

export function useFilteredPlugins<const P extends PluginManifest & { core?: boolean }>(
    plugins: P[],
    query: string,
    options: { showCorePlugins: boolean; sortMode: 'asc' | 'dsc' },
) {
    const { showCorePlugins, sortMode } = options

    const _plugins = useMemo(
        () =>
            plugins
                .filter(
                    plugin =>
                        plugin.name.toLowerCase().replaceAll(/\s/g, '').includes(query) ||
                        plugin.id.toLowerCase().includes(query),
                )
                .sort((a, b) => (sortMode === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))),
        [plugins, query, sortMode],
    )

    const externalPlugins = useMemo(() => _plugins.filter(plugin => !plugin.core), [_plugins])
    const corePlugins = useMemo(() => _plugins.filter(plugin => plugin.core), [_plugins])
    const empty = !(showCorePlugins ? corePlugins.length + externalPlugins.length : externalPlugins.length)

    // TODO: Maybe create 2 separate data lists for non-filtered and filtered plugins
    const noSearchResults = empty && !!query

    return { plugins: _plugins, externalPlugins, corePlugins, empty, noSearchResults }
}
