import { NavigationNative } from '@revenge-mod/modules/common'
import { TableRow, TableRowGroup, TableRowIcon } from '@revenge-mod/modules/common/components'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'
import { settings } from '@revenge-mod/preferences'
import { useObservable } from '@revenge-mod/storage'

import PageWrapper from './(Wrapper)'

import { ScrollView } from 'react-native'

export default function RevengeSettingsPage() {
    const { assets } = revenge
    const navigation = NavigationNative.useNavigation()

    useObservable([settings])

    return (
        <ScrollView>
            <PageWrapper>
                <TableRowGroup title="Info">
                    <TableRow
                        label="About"
                        icon={<TableRowIcon source={assets.getIndexByName('CircleInformationIcon-primary')!} />}
                        arrow
                        onPress={() => navigation.push('RevengeAbout')}
                    />
                </TableRowGroup>
                <TableRowGroup title="Actions">
                    <TableRow
                        label="Reload Discord"
                        icon={<TableRowIcon source={assets.getIndexByName('RetryIcon')!} />}
                        // Passing BundleUpdaterManager.reload directly just explodes for some reason. Maybe onPress had args?
                        onPress={() => BundleUpdaterManager.reload()}
                    />
                </TableRowGroup>
            </PageWrapper>
        </ScrollView>
    )
}
