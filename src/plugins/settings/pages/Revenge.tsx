import { getAssetIndexByName } from '@revenge-mod/assets'
import { NavigationNative, links } from '@revenge-mod/modules/common'
import { TableRow, TableRowGroup, TableRowIcon } from '@revenge-mod/modules/common/components'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'
import { settings } from '@revenge-mod/preferences'
import { useObservable } from '@revenge-mod/storage'

import { DiscordURL, GitHubURL } from '../constants'
import PageWrapper from './(Wrapper)'

import { ScrollView } from 'react-native'

export default function RevengeSettingsPage() {
    const navigation = NavigationNative.useNavigation()

    useObservable([settings])

    return (
        <ScrollView>
            <PageWrapper>
                <TableRowGroup title="Info">
                    <TableRow
                        label="About"
                        icon={<TableRowIcon source={getAssetIndexByName('CircleInformationIcon-primary')!} />}
                        arrow
                        onPress={() => navigation.navigate('RevengeAbout')}
                    />
                </TableRowGroup>
                <TableRowGroup title="Revenge">
                    <TableRow
                        label="Discord"
                        icon={<TableRowIcon source={getAssetIndexByName('Discord')!} />}
                        arrow
                        onPress={() => links.openDeeplink(DiscordURL)}
                    />
                    <TableRow
                        label="GitHub"
                        icon={<TableRowIcon source={getAssetIndexByName('img_account_sync_github_white')!} />}
                        arrow
                        onPress={() => links.openURL(GitHubURL)}
                    />
                    <TableRow
                        label="Contributors"
                        icon={<TableRowIcon source={getAssetIndexByName('FriendsIcon')!} />}
                        arrow
                        onPress={() => navigation.navigate('RevengeContributors')}
                    />
                </TableRowGroup>
                <TableRowGroup title="Actions">
                    <TableRow
                        label="Reload Discord"
                        icon={<TableRowIcon source={getAssetIndexByName('RetryIcon')!} />}
                        // Passing BundleUpdaterManager.reload directly just explodes for some reason. Maybe onPress had args?
                        onPress={() => BundleUpdaterManager.reload()}
                    />
                </TableRowGroup>
            </PageWrapper>
        </ScrollView>
    )
}
