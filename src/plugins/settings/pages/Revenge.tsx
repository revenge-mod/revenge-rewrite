import { NavigationNative } from '@revenge-mod/modules/common'
import { Stack, TableRow, TableRowGroup, TableRowIcon, TableSwitchRow } from '@revenge-mod/modules/common/components'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'
import { settings } from '@revenge-mod/preferences'
import { useObservable } from '@revenge-mod/storage'

import PageWrapper from './(Wrapper)'

import type { ComponentType } from 'react'

export default function RevengeSettingsPage() {
    const { assets } = revenge
    const navigation = NavigationNative.useNavigation()

    useObservable([settings])

    return (
        <PageWrapper>
            <Stack style={{ paddingHorizontal: 16, paddingVertical: 24 }} spacing={16} direction="vertical">
                <TableRowGroup title="Info">
                    <TableRow
                        label="About"
                        icon={<TableRowIcon source={assets.getIndexByName('CircleInformationIcon')} />}
                        trailing={<TableRow.Arrow />}
                        onPress={() => navigation.push('RevengeAbout')}
                    />
                </TableRowGroup>
                <TableRowGroup title="Actions">
                    <TableRow
                        label="Reload Discord"
                        icon={<TableRowIcon source={assets.getIndexByName('RetryIcon')} />}
                        // Passing BundleUpdaterManager.reload directly just explodes for some reason. Maybe onPress had args?
                        onPress={() => BundleUpdaterManager.reload()}
                    />
                </TableRowGroup>
                <TableRowGroup title="Advanced">
                    <TableSwitchRow
                        label="Show Developer Options"
                        icon={<TableRowIcon source={assets.getIndexByName('WrenchIcon')} />}
                        value={settings.developer.settingsPageShown}
                        onValueChange={(v: boolean) => (settings.developer.settingsPageShown = v)}
                    />
                    {...rows.map((Row, index) => <Row key={index.toString()} />)}
                </TableRowGroup>
            </Stack>
        </PageWrapper>
    )
}

const rows: ComponentType[] = []

/**
 * Yes, this is oddly specific, but who cares
 * @internal
 */
export function addTableRowsToAdvancedSectionInRevengePage(...comps: ComponentType[]) {
    rows.push(...comps)
}
