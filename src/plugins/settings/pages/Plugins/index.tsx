import { getAssetIndexByName } from '@revenge-mod/assets'

import { openAlert } from '@revenge-mod/modules/common'
import {
    AlertActionButton,
    AlertModal,
    ContextMenu,
    IconButton,
    Stack,
    TableRowGroupTitle,
    Text,
} from '@revenge-mod/modules/common/components'
import { CheckmarkLargeIcon } from '@revenge-mod/modules/common/components/icons'

import { type ComponentProps, memo, useContext, useState } from 'react'
import { ScrollView, View } from 'react-native'

import { pluginsStates } from '@revenge-mod/preferences'
import { useObservable } from '@revenge-mod/storage'

import { externalPluginsMetadata, registeredPlugins } from '@revenge-mod/plugins/internals'

import { Show } from '@revenge-mod/shared/components'

import BrowsePluginsButton from './components/BrowsePluginsButton'
import { NoPlugins, NoResults } from './components/Illustrations'
import InstalledPluginCard from './components/InstalledPluginCard'
import MasonaryFlashPluginList from './components/MasonaryFlashPluginList'
import PluginListSearchAndFilters from './components/PluginListSearchInput'
import { PluginSettingsPageContext, styles } from './components/shared'

import { useFilteredPlugins } from './hooks'

import PageWrapper from '../(Wrapper)'
import { PluginContext } from '../..'

import type { DiscordModules } from '@revenge-mod/modules'

export default function PluginsSettingsPage() {
    const { storage } = useContext(PluginContext)
    useObservable([pluginsStates, storage, externalPluginsMetadata])

    const [query, setQuery] = useState('')
    const { showCorePlugins: showInternalPlugins, sortMode } = storage.plugins
    const { externalPlugins, internalPlugins, empty, noSearchResults } = useFilteredPlugins(
        Object.values(registeredPlugins),
        query,
        storage.plugins,
    )

    const ContextMenuComponent = memo(
        ({ children }: Pick<ComponentProps<DiscordModules.Components.ContextMenu>, 'children'>) => (
            <ContextMenu
                title="Sort & Filter"
                items={[
                    ...(empty
                        ? []
                        : [
                              [
                                  {
                                      label: 'Sort by name (A-Z)',
                                      IconComponent: sortMode === 'asc' ? CheckmarkLargeIcon : undefined,
                                      action: () => (storage.plugins.sortMode = 'asc'),
                                  },
                                  {
                                      label: 'Sort by name (Z-A)',
                                      IconComponent: sortMode === 'dsc' ? CheckmarkLargeIcon : undefined,
                                      action: () => (storage.plugins.sortMode = 'dsc'),
                                  },
                              ],
                          ]),
                    [
                        {
                            label: 'Show internal plugins',
                            IconComponent: showInternalPlugins ? CheckmarkLargeIcon : undefined,
                            variant: 'destructive',
                            action: () => (storage.plugins.showCorePlugins = !showInternalPlugins),
                        },
                    ],
                ]}
            >
                {children}
            </ContextMenu>
        ),
    )

    return (
        <PageWrapper withTopControls>
            <PluginSettingsPageContext.Provider
                value={{ setQuery, showInternalPlugins, sortMode, ContextMenuComponent }}
            >
                <Stack spacing={16} style={styles.grow}>
                    <Show when={!empty || noSearchResults} fallback={<NoPlugins />}>
                        <PluginListSearchAndFilters />
                        <Show when={!noSearchResults} fallback={<NoResults />}>
                            <ScrollView
                                fadingEdgeLength={32}
                                keyboardShouldPersistTaps="handled"
                                style={styles.autoSize}
                            >
                                <MasonaryFlashPluginList
                                    data={externalPlugins}
                                    ListItemComponent={InstalledPluginCard}
                                />
                                <Show when={showInternalPlugins}>
                                    <MasonaryFlashPluginList
                                        data={internalPlugins}
                                        header={
                                            // TableRowGroupTitle probably has some margin, setting it to flex-end causes it to be in the center, lucky.
                                            <View style={styles.headerContainer}>
                                                <TableRowGroupTitle title="Internal Plugins" />
                                                <IconButton
                                                    icon={getAssetIndexByName('CircleQuestionIcon-primary')!}
                                                    size="sm"
                                                    variant="tertiary"
                                                    onPress={showCorePluginsInformationAlert}
                                                />
                                            </View>
                                        }
                                        ListItemComponent={InstalledPluginCard}
                                    />
                                </Show>
                                <PluginBrowserCTA />
                            </ScrollView>
                        </Show>
                    </Show>
                </Stack>
            </PluginSettingsPageContext.Provider>
        </PageWrapper>
    )
}

function PluginBrowserCTA() {
    return (
        <View style={[styles.centerChildren, styles.browserCtaContainer]}>
            <Text variant="heading-lg/semibold">Want more plugins? Browse them here!</Text>
            <BrowsePluginsButton />
        </View>
    )
}

function showCorePluginsInformationAlert() {
    return openAlert(
        'revenge.plugins.settings.plugins.internal-plugins.description',
        <AlertModal
            title="What are internal plugins?"
            content="Internal plugins are integrated into Revenge and provide core functionalities, such as this settings menu. Some internal plugins cannot be disabled, as they provide resources required by other plugins."
            actions={<AlertActionButton text="OK" />}
        />,
    )
}
