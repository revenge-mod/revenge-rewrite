import { getAssetIndexByName } from '@revenge-mod/assets'

import { NavigationNative } from '@revenge-mod/modules/common'

import { ContextMenu, IconButton, Stack } from '@revenge-mod/modules/common/components'
import { FolderIcon } from '@revenge-mod/modules/common/components/icons'

import { Show } from '@revenge-mod/shared/components'

import { memo, useEffect, useState } from 'react'
import { Platform } from 'react-native'

import InstallablePluginCard from './components/InstallablePluginCard'
import MasonaryFlashPluginList from './components/MasonaryFlashPluginList'
import PluginListSearchInput from './components/PluginListSearchInput'
import { PluginSettingsPageContext, styles } from './components/shared'

import PageWrapper from '../(Wrapper)'
import { installPluginFromStorage } from './utils'

import { NoPlugins, NoResults } from './components/Illustrations'
import { useFilteredPlugins } from './hooks'

import type { PluginManifest } from '@revenge-mod/plugins/schemas'

export default function PluginBrowserPage() {
    const navigation = NavigationNative.useNavigation()

    // biome-ignore lint/correctness/useExhaustiveDependencies: We only want to run this once
    useEffect(
        () =>
            void (
                Platform.OS === 'android' &&
                navigation.setOptions({
                    headerRight: () => (
                        <ContextMenu
                            title="More options"
                            items={[
                                {
                                    label: 'Install from storage',
                                    action: installPluginFromStorage,
                                    IconComponent: FolderIcon,
                                },
                            ]}
                        >
                            {props => (
                                <IconButton
                                    {...props}
                                    variant="tertiary"
                                    icon={getAssetIndexByName('MoreHorizontalIcon')}
                                />
                            )}
                        </ContextMenu>
                    ),
                })
            ),
        [],
    )

    const [query, setQuery] = useState('')

    const { externalPlugins, empty, noSearchResults } = useFilteredPlugins<PluginManifest & { url: string }>(
        [
            {
                name: 'Mock Plugin',
                description: 'This is a mock plugin',
                author: 'Mock Author',
                id: 'mock-plugin-1',
                url: 'https://palmdevs.me/mock-plugin.zip',
                version: '1.0.0',
                icon: 'Revenge.PluginIcon',
            },
            {
                name: 'Another Mock Plugin',
                description: 'This is another mock plugin',
                author: 'Mock Author',
                id: 'mock-plugin-2',
                url: 'https://palmdevs.me/mock-plugin-2.zip',
                version: '1.0.0',
                icon: 'Revenge.PluginIcon',
            },
        ],
        query,
        { showCorePlugins: false, sortMode: 'asc' },
    )

    return (
        <PageWrapper withTopControls>
            <PluginSettingsPageContext.Provider
                value={{ setQuery, showCorePlugins: false, sortMode: 'asc', ContextMenuComponent: memo(() => null) }}
            >
                <Stack spacing={16} style={styles.grow}>
                    <Show when={!empty || noSearchResults} fallback={<NoPlugins />}>
                        <PluginListSearchInput />
                        <Show when={!noSearchResults} fallback={<NoResults />}>
                            <MasonaryFlashPluginList ListItemComponent={InstallablePluginCard} data={externalPlugins} />
                        </Show>
                    </Show>
                </Stack>
            </PluginSettingsPageContext.Provider>
        </PageWrapper>
    )
}
