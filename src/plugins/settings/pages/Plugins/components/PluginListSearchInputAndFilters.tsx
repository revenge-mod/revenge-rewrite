import { getAssetIndexByName } from '@revenge-mod/assets'
import { IconButton } from '@revenge-mod/modules/common/components'
import { SearchInput } from '@revenge-mod/ui/components'

import { useContext } from 'react'
import { View } from 'react-native'

import { PluginSettingsPageContext, styles } from './shared'
import { Show } from '@revenge-mod/shared/components'

export default function PluginListSearchAndFilters() {
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
            <Show when={ContextMenuComponent}>
                {React.createElement(ContextMenuComponent!, {
                    // biome-ignore lint/correctness/noChildrenProp: This is a valid use case
                    children: props => (
                        <IconButton
                            {...props}
                            icon={getAssetIndexByName('FiltersHorizontalIcon')!}
                            variant="secondary-overlay"
                        />
                    ),
                })}
            </Show>
        </View>
    )
}
