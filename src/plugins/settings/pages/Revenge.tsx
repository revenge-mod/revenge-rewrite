import { NavigationNative } from '@revenge-mod/modules/common'
import { TableRow, TableRowGroup, TableRowIcon } from '@revenge-mod/modules/common/components'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'
import { settings } from '@revenge-mod/preferences'
import { useObservable } from '@revenge-mod/storage'

import PageWrapper from './(Wrapper)'

import type { ComponentType } from 'react'
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
                <TableRowGroup title="Advanced">
                    {[...rows].map((Row, index) => (
                        <Row key={index.toString()} />
                    ))}
                </TableRowGroup>
            </PageWrapper>
        </ScrollView>
    )
}

const rows = new Set<ComponentType>()

/**
 * Yes, this is oddly specific, but who cares
 * @internal
 */
export function addTableRowsToAdvancedSectionInRevengePage(...comps: ComponentType[]) {
    for (const comp of comps) rows.add(comp)

    return () => {
        for (const comp of comps) rows.delete(comp)
    }
}
