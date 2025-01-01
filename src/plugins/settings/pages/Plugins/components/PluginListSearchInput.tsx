import { getAssetIndexByName } from '@revenge-mod/assets'
import { IconButton } from '@revenge-mod/modules/common/components'
import { SearchInput } from '@revenge-mod/ui/components'

import { useContext } from 'react'
import { View } from 'react-native'

import { PluginSettingsPageContext, styles } from './shared'

export default function PluginListSearchInput() {
    const { setQuery, ContextMenuComponent } = useContext(PluginSettingsPageContext)

    return (
        <View style={styles.queryContainer}>
            <View style={styles.grow}>
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
