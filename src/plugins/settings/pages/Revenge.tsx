import { NavigationNative } from '@revenge-mod/modules/common'
import {
    Stack,
    TableRow,
    TableRowGroup,
    TableRowIcon,
    TableRowTrailingText,
    TableSwitchRow,
} from '@revenge-mod/modules/common/components'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'

import RevengeIcon from '../../../assets/revenge.png'
import { settings } from '@revenge-mod/settings'
import { useObservable } from '@revenge-mod/storage'
import type { ComponentType } from 'react'

export default function RevengeSettingsPage() {
    const { assets, modules } = revenge
    const { ClientInfoModule } = modules.native
    const navigation = NavigationNative.useNavigation()

    useObservable([settings])

    return (
        <Stack style={{ paddingHorizontal: 16, paddingVertical: 24 }} spacing={16} direction="vertical">
            <TableRowGroup title="Info">
                {[
                    {
                        label: 'Revenge',
                        icon: {
                            uri: RevengeIcon,
                        },
                        trailing: __BUNDLE_RELEASE__,
                    },
                    {
                        label: 'Discord',
                        icon: assets.getIndexByName('Discord'),
                        trailing: `${ClientInfoModule.Version} (${ClientInfoModule.Build})`,
                    },
                ].map(props => (
                    // biome-ignore lint/correctness/useJsxKeyInIterable: This page never gets updated
                    <TableRow
                        label={props.label}
                        icon={<TableRowIcon source={props.icon} />}
                        trailing={<TableRowTrailingText text={props.trailing} />}
                    />
                ))}
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
                    value={settings.developerSettingsEnabled}
                    onValueChange={(v: boolean) => settings.developerSettingsEnabled = v}
                />
                {...rows.map((Row, index) => <Row key={index.toString()} />)}
            </TableRowGroup>
        </Stack>
    )
}

const rows: ComponentType[] = []

/**
 * Yes, this is oddly specific, but who cares
 * @internal
 */
export function internal_addTableRowsToAdvancedSectionInRevengePage(...comps: ComponentType[]) {
    rows.push(...comps)
}