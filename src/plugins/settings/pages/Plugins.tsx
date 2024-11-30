import { getAssetIndexByName } from '@revenge-mod/assets'
import { createStyles, openAlert } from '@revenge-mod/modules/common'
import { AlertActionButton, AlertModal, Card, FormSwitch, Stack, Text } from '@revenge-mod/modules/common/components'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'
import { plugins } from '@revenge-mod/plugins/internals'
import { SemanticColor } from '@revenge-mod/ui/colors'
import { SearchInput } from '@revenge-mod/ui/components'

import PageWrapper from './(Wrapper)'

import { MasonryFlashList } from '@shopify/flash-list'
import { useMemo, useState } from 'react'
import { Image, PixelRatio, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'

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
    resizable: {
        flex: 1,
    },
})

// TODO: Settings components
function PluginCard({
    id,
    name,
    icon,
    core,
    manageable,
    enabled: _enabled,
    author,
    description,
    horizontalGaps,
}: PluginCardProps) {
    const cardStyles = usePluginCardStyles()
    const [enabled, setEnabled] = useState(_enabled)

    return (
        <Card style={[cardStyles.card, ...(horizontalGaps ? [{ marginRight: 12 }] : [])]}>
            <Stack direction="horizontal" style={styles.growable}>
                <Stack spacing={8} direction="horizontal" style={[cardStyles.topContainer, styles.resizable]}>
                    <Image source={getAssetIndexByName(icon ?? 'Revenge.PluginIcon')!} style={cardStyles.icon} />
                    <Text variant="heading-lg/semibold">{name}</Text>
                </Stack>
                <View style={{ opacity: manageable ? 1 : 0.5 }}>
                    <FormSwitch
                        value={enabled}
                        disabled={!manageable}
                        onValueChange={async val => {
                            if (!val && core) {
                                const _continue = await new Promise<boolean>(resolve => {
                                    openAlert(
                                        'revenge.plugins.settings.plugins.core-plugins.disable-warning',
                                        <AlertModal
                                            title="Disable a core plugin?"
                                            content="Core plugins are an essential part of Revenge. Disabling them may cause unexpected behavior."
                                            actions={
                                                <>
                                                    <AlertActionButton
                                                        variant="destructive"
                                                        text="Disable anyways"
                                                        onPress={() => resolve(true)}
                                                    />
                                                    <AlertActionButton
                                                        variant="secondary"
                                                        text="Cancel"
                                                        onPress={() => resolve(false)}
                                                    />
                                                </>
                                            }
                                        />,
                                    )
                                })

                                if (!_continue) return
                            }

                            const plugin = plugins.get(id)!
                            if (val) {
                                const reloadRequired = plugin.enable()
                                if (reloadRequired)
                                    openAlert(
                                        'revenge.plugins.reload-required',
                                        <AlertModal
                                            title="Reload required"
                                            content="The plugin you have enabled requires a reload to take effect. Would you like to reload now?"
                                            actions={
                                                <>
                                                    <AlertActionButton
                                                        variant="destructive"
                                                        text="Reload"
                                                        onPress={() => BundleUpdaterManager.reload()}
                                                    />
                                                    <AlertActionButton variant="secondary" text="Cancel" />
                                                </>
                                            }
                                        />,
                                    )
                                else plugin.start()
                            } else plugin.disable()

                            setEnabled(val)
                        }}
                    />
                </View>
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

export default function PluginsSettingsPage() {
    const [query, setQuery] = useState('')
    const dimensions = useWindowDimensions()
    const numColumns = Math.floor((dimensions.width - 16) / 448)
    const data = useMemo(
        () =>
            [...plugins.values()].filter(
                plugin =>
                    plugin.name.toLowerCase().replaceAll(/\s/g, '').includes(query) ||
                    plugin.id.toLowerCase().includes(query),
            ),
        [query],
    )

    return (
        <PageWrapper>
            <SearchInput size="md" onChange={query => setQuery(query.replaceAll(/\s/g, '').toLowerCase())} />
            <ScrollView contentContainerStyle={{ flex: 1 }}>
                <MasonryFlashList
                    fadingEdgeLength={32}
                    key={numColumns}
                    data={data}
                    renderItem={({ item, columnIndex }) => (
                        <PluginCard {...item} horizontalGaps={dimensions.width > 464 && columnIndex < numColumns - 1} />
                    )}
                    // Don't ask...
                    estimatedItemSize={24.01 + 32 + 62 * PixelRatio.getFontScale() ** 1.35}
                    keyExtractor={item => item.id}
                    numColumns={numColumns}
                    keyboardShouldPersistTaps="handled"
                />
            </ScrollView>
        </PageWrapper>
    )
}
