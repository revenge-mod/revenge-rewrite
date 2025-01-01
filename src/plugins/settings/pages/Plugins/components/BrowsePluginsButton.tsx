import { getAssetIndexByName } from '@revenge-mod/assets'
import { NavigationNative } from '@revenge-mod/modules/common'
import { Button } from '@revenge-mod/modules/common/components'

export default function BrowsePluginsButton() {
    const navigation = NavigationNative.useNavigation()

    return (
        <Button
            size="lg"
            icon={getAssetIndexByName('CompassIcon')}
            variant="primary"
            text="Browse plugins"
            onPress={() => navigation.navigate('RevengePluginBrowser')}
        />
    )
}
