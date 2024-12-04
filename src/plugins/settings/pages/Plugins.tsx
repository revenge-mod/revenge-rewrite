import { getAssetIndexByName } from '@revenge-mod/assets'

import { createStyles, openAlert } from '@revenge-mod/modules/common'
import {
    AlertActionButton,
    AlertModal,
    Button,
    Card,
    ContextMenu,
    IconButton,
    MasonryFlashList,
    Stack,
    TableRowGroupTitle,
    Text,
} from '@revenge-mod/modules/common/components'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'

import { plugins } from '@revenge-mod/plugins/internals'

import { SemanticColor } from '@revenge-mod/ui/colors'
import { FormSwitch, SearchInput } from '@revenge-mod/ui/components'

import PageWrapper from './(Wrapper)'

import {
    type ComponentProps,
    type FC,
    type MemoExoticComponent,
    type ReactElement,
    createContext,
    memo,
    useContext,
    useMemo,
    useState,
} from 'react'
import { Image, PixelRatio, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'

import type { DiscordModules } from '@revenge-mod/modules'
import { CheckmarkLargeIcon } from '@revenge-mod/modules/common/components/icons'
import { pluginsStates } from '@revenge-mod/preferences'
import { useObservable } from '@revenge-mod/storage'
import type { MasonryFlashListProps } from '@shopify/flash-list'
import { PluginContext, type Storage } from '..'

const usePluginCardStyles = createStyles({
    icon: {
        width: 20,
        height: 20,
        tintColor: SemanticColor.TEXT_NORMAL,
    },
    card: {
        flexGrow: 1,
        marginBottom: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 4,
    },
    withGap: {
        marginRight: 12,
    },
    topContainer: {
        alignItems: 'center',
    },
    alignedContainer: {
        paddingLeft: 28,
    },
})

const styles = StyleSheet.create({
    growable: {
        flexGrow: 1,
    },
    centerChildren: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    resizable: {
        flex: 1,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingBottom: 12,
    },
    queryContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 8,
    },
    emptyImage: {
        width: '40%',
        height: '20%',
        objectFit: 'contain',
    },
})

// TODO: Settings components
function PluginCard({
    id,
    name,
    icon,
    manageable,
    enabled: _enabled,
    author,
    description,
    horizontalGaps,
}: PluginCardProps) {
    const cardStyles = usePluginCardStyles()
    const [enabled, setEnabled] = useState(_enabled)

    return (
        <Card style={[cardStyles.card, horizontalGaps && cardStyles.withGap]}>
            <Stack direction="horizontal" style={styles.growable}>
                <Stack spacing={8} direction="horizontal" style={[cardStyles.topContainer, styles.resizable]}>
                    <Image source={getAssetIndexByName(icon ?? 'Revenge.PluginIcon')!} style={cardStyles.icon} />
                    <Text variant="heading-lg/semibold">{name}</Text>
                </Stack>
                <FormSwitch
                    value={enabled}
                    disabled={!manageable}
                    onValueChange={async enabled => {
                        const plugin = plugins[id]!

                        if (enabled) {
                            const reloadRequired = plugin.enable()
                            if (reloadRequired) showReloadRequiredAlert(enabled)
                            else await plugin.start()
                        } else {
                            const { reloadRequired } = plugin.disable()
                            if (reloadRequired) showReloadRequiredAlert(enabled)
                        }

                        setEnabled(enabled)
                    }}
                />
            </Stack>
            <Stack spacing={4} direction="vertical" style={[cardStyles.alignedContainer, styles.growable]}>
                <Text style={styles.growable} variant="heading-md/medium" color="text-muted">
                    by {author}
                </Text>
                <Text style={styles.growable} variant="text-md/medium">
                    {description}
                </Text>
            </Stack>
        </Card>
    )
}

interface PluginCardProps {
    name: string
    description: string
    author: string
    id: string
    version: string
    icon?: string
    enabled: boolean
    manageable: boolean
    core: boolean
    horizontalGaps: boolean
}

type PluginSettingsPageContextValue = Storage['plugins'] & {
    setQuery: (query: string) => void
    ContextMenuComponent: MemoExoticComponent<
        FC<Pick<ComponentProps<DiscordModules.Components.ContextMenu>, 'children'>>
    >
}

const PluginSettingsPageContext = createContext<PluginSettingsPageContextValue>(undefined!)

export default function PluginsSettingsPage() {
    const { storage } = useContext(PluginContext)
    useObservable([pluginsStates, storage])

    const [query, setQuery] = useState('')
    const { showCorePlugins, sortMode } = storage.plugins

    const allPlugins = useMemo(
        () =>
            Object.values(plugins)
                .filter(
                    plugin =>
                        plugin.name.toLowerCase().replaceAll(/\s/g, '').includes(query) ||
                        plugin.id.toLowerCase().includes(query),
                )
                .sort((a, b) =>
                    storage.plugins.sortMode === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
                ),
        [query, storage.plugins.sortMode],
    )

    const externalPluginsData = useMemo(() => allPlugins.filter(plugin => !plugin.core), [allPlugins])
    const corePluginsData = useMemo(() => allPlugins.filter(plugin => plugin.core), [allPlugins])

    const MemoizedContextMenu = memo(
        ({ children }: Pick<ComponentProps<DiscordModules.Components.ContextMenu>, 'children'>) => {
            return (
                <ContextMenu
                    title="Sort & Filter"
                    items={[
                        ...(pluginListEmpty
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
                                label: 'Show core plugins',
                                IconComponent: showCorePlugins ? CheckmarkLargeIcon : undefined,
                                variant: 'destructive',
                                action: () => (storage.plugins.showCorePlugins = !showCorePlugins),
                            },
                        ],
                    ]}
                >
                    {children}
                </ContextMenu>
            )
        },
    )

    const pluginListEmpty = !(showCorePlugins
        ? corePluginsData.length + externalPluginsData.length
        : externalPluginsData.length)

    // TODO: Maybe create 2 separate data lists for non-filtered and filtered plugins
    const pluginListNoResults = pluginListEmpty && query

    return (
        <PageWrapper withTopControls>
            <PluginSettingsPageContext.Provider
                value={{ setQuery, showCorePlugins, sortMode, ContextMenuComponent: MemoizedContextMenu }}
            >
                {pluginListEmpty && !pluginListNoResults ? (
                    <PluginsSettingsPageEmptyView />
                ) : (
                    <>
                        <PluginsSettingsPageSearch />
                        {pluginListNoResults ? (
                            <PluginsSettingsPageNoResultsView />
                        ) : (
                            <ScrollView
                                fadingEdgeLength={32}
                                keyboardShouldPersistTaps="handled"
                                style={styles.resizable}
                            >
                                <PluginsSettingsPageMasonaryFlashList data={externalPluginsData} />
                                {showCorePluginsInformationAlert && (
                                    <PluginsSettingsPageMasonaryFlashList
                                        header={
                                            <View style={styles.headerContainer}>
                                                {/* TableRowGroupTitle probably has some margin, setting it to flex-end causes it to be in the center, lucky. */}
                                                <TableRowGroupTitle title="Core Plugins" />
                                                <IconButton
                                                    icon={getAssetIndexByName('CircleQuestionIcon-primary')!}
                                                    size="sm"
                                                    variant="tertiary"
                                                    onPress={showCorePluginsInformationAlert}
                                                />
                                            </View>
                                        }
                                        data={corePluginsData}
                                    />
                                )}
                            </ScrollView>
                        )}
                    </>
                )}
            </PluginSettingsPageContext.Provider>
        </PageWrapper>
    )
}

function PluginsSettingsPageEmptyView() {
    const { ContextMenuComponent } = useContext(PluginSettingsPageContext)

    return (
        <Stack spacing={24} style={[styles.growable, styles.centerChildren]}>
            <Image source={getAssetIndexByName('empty')} style={styles.emptyImage} />
            <Text variant="heading-lg/semibold">No plugins yet!</Text>
            <View style={{ gap: 8 }}>
                <Button
                    size="lg"
                    icon={getAssetIndexByName('DownloadIcon')}
                    variant="primary"
                    disabled
                    text="Install a plugin"
                />
                <ContextMenuComponent>
                    {props => (
                        <Button
                            {...props}
                            size="lg"
                            icon={getAssetIndexByName('FiltersHorizontalIcon')}
                            variant="secondary"
                            text="Change filters"
                        />
                    )}
                </ContextMenuComponent>
            </View>
        </Stack>
    )
}

function PluginsSettingsPageNoResultsView() {
    return (
        <Stack spacing={24} style={[styles.growable, styles.centerChildren]}>
            <Image source={getAssetIndexByName('empty_quick_switcher')} style={styles.emptyImage} />
            <Text variant="heading-lg/semibold">No results...</Text>
        </Stack>
    )
}

type PluginsSettingsPageMasonaryFlashListData = Omit<PluginCardProps, 'horizontalGaps'>[]

function PluginsSettingsPageMasonaryFlashList({
    data,
    header,
}: {
    header?: ReactElement
    data: PluginsSettingsPageMasonaryFlashListData
}) {
    const dimensions = useWindowDimensions()
    const numColumns = Math.floor((dimensions.width - 16) / 448)
    // Don't ask...
    const estimatedItemSize = 24.01 + 32 + 62 * PixelRatio.getFontScale() ** 1.35

    // biome-ignore lint/correctness/useExhaustiveDependencies: Nothing changes about this function, at all
    const renderItem = useMemo(
        () =>
            ({
                item,
                columnIndex,
            }: Parameters<
                NonNullable<MasonryFlashListProps<PluginsSettingsPageMasonaryFlashListData[number]>['renderItem']>
            >[0]) => <PluginCard {...item} horizontalGaps={dimensions.width > 464 && columnIndex < numColumns - 1} />,
        [],
    )

    return (
        <MasonryFlashList
            stickyHeaderIndices={header ? [0] : undefined}
            ListHeaderComponent={header}
            renderItem={renderItem}
            data={data}
            keyExtractor={item => item.id}
            numColumns={numColumns}
            estimatedItemSize={estimatedItemSize}
            keyboardShouldPersistTaps="handled"
        />
    )
}

function PluginsSettingsPageSearch() {
    const { setQuery, ContextMenuComponent } = useContext(PluginSettingsPageContext)

    return (
        <View style={styles.queryContainer}>
            <View style={styles.growable}>
                <SearchInput
                    isRound
                    isClearable
                    size="md"
                    onChange={query => setQuery(query.replaceAll(/\s/g, '').toLowerCase())}
                />
            </View>
            <ContextMenuComponent>
                {props => (
                    <IconButton {...props} icon={getAssetIndexByName('FiltersHorizontalIcon')!} variant="tertiary" />
                )}
            </ContextMenuComponent>
        </View>
    )
}

function showReloadRequiredAlert(enabling: boolean) {
    openAlert(
        'revenge.plugins.reload-required',
        <AlertModal
            title="Reload required"
            content={
                enabling
                    ? 'The plugin you have enabled requires a reload to take effect. Would you like to reload now?'
                    : 'The plugin you have disabled requires a reload to reverse its effects. Would you like to reload now?'
            }
            actions={
                <>
                    <AlertActionButton
                        variant="destructive"
                        text="Reload"
                        onPress={() => BundleUpdaterManager.reload()}
                    />
                    <AlertActionButton variant="secondary" text="Not now" />
                </>
            }
        />,
    )
}

function showCorePluginsInformationAlert() {
    return openAlert(
        'revenge.plugins.settings.plugins.core-plugins.description',
        <AlertModal
            title="What are core plugins?"
            content="Core plugins are an essential part of Revenge. They provide core functionalities like allowing you to access this settings menu. Disabling core plugins may cause unexpected behavior."
            actions={<AlertActionButton variant="secondary" text="Got it" />}
        />,
    )
}
