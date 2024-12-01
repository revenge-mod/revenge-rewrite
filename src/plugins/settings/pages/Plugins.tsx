import { getAssetIndexByName } from '@revenge-mod/assets'
import { createStyles, openAlert } from '@revenge-mod/modules/common'
import {
    AlertActionButton,
    AlertModal,
    Card,
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
                        if (!enabled && core && !(await showDisableCorePluginConfirmation())) return

                        const plugin = plugins[id]!

                        if (enabled) {
                            const reloadRequired = plugin.enable()
                            if (reloadRequired) showReloadRequiredAlert()
                            else await plugin.start()
                        } else plugin.disable()

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

export default function PluginsSettingsPage() {
    const [query, setQuery] = useState('')
    const dimensions = useWindowDimensions()
    const numColumns = Math.floor((dimensions.width - 16) / 448)
    const data = useMemo(
        () =>
            Object.values(plugins).filter(
                plugin =>
                    plugin.name.toLowerCase().replaceAll(/\s/g, '').includes(query) ||
                    plugin.id.toLowerCase().includes(query),
            ),
        [query],
    )

    return (
        <PageWrapper>
            <SearchInput size="md" onChange={query => setQuery(query.replaceAll(/\s/g, '').toLowerCase())} />
            {/* TableRowGroupTitle probably has some margin, setting it to flex-end causes it to be in the center, lucky. */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <TableRowGroupTitle title="Core Plugins" />
                <IconButton
                    icon={getAssetIndexByName('CircleQuestionIcon-primary')!}
                    size="sm"
                    variant="secondary"
                    onPress={() =>
                        openAlert(
                            'revenge.plugins.settings.plugins.core-plugins.description',
                            <AlertModal
                                title="What are core plugins?"
                                content="Core plugins are an essential part of Revenge. They provide core functionalities like allowing you to access this settings menu. Disabling core plugins may cause unexpected behavior."
                                actions={<AlertActionButton variant="secondary" text="Got it" />}
                            />,
                        )
                    }
                />
            </View>
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

function showDisableCorePluginConfirmation() {
    return new Promise<boolean>(resolve => {
        openAlert(
            'revenge.plugins.settings.plugins.core-plugins.disable-warning',
            <AlertModal
                title="Disable core plugin?"
                content="Core plugins are an essential part of Revenge. Disabling them may cause unexpected behavior."
                actions={
                    <>
                        <AlertActionButton variant="destructive" text="Disable anyways" onPress={() => resolve(true)} />
                        <AlertActionButton variant="secondary" text="Cancel" onPress={() => resolve(false)} />
                    </>
                }
            />,
        )
    })
}

function showReloadRequiredAlert() {
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
}
