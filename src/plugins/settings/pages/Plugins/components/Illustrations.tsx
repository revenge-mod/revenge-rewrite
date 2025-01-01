import { getAssetIndexByName } from '@revenge-mod/assets'
import { Button, Stack, Text } from '@revenge-mod/modules/common/components'

import { useContext } from 'react'
import { Image, View } from 'react-native'

import BrowsePluginsButton from './BrowsePluginsButton'
import { PluginSettingsPageContext, styles } from './shared'

export function NoPlugins() {
    const { ContextMenuComponent } = useContext(PluginSettingsPageContext)

    return (
        <Stack spacing={24} style={[styles.grow, styles.centerChildren]}>
            <Image source={getAssetIndexByName('empty')} style={styles.emptyImage} />
            <Text variant="heading-lg/semibold">No plugins yet!</Text>
            <View style={[styles.centerChildren, { gap: 8 }]}>
                <BrowsePluginsButton />
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

export function NoResults() {
    return (
        <Stack spacing={24} style={[styles.grow, styles.centerChildren]}>
            <Image source={getAssetIndexByName('empty_quick_switcher')} style={styles.emptyImage} />
            <Text variant="heading-lg/semibold">No results...</Text>
        </Stack>
    )
}
