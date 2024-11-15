import { NavigationNative } from '@revenge-mod/modules/common'
import { Stack, TableRow, TableRowGroup, TableRowIcon } from '@revenge-mod/modules/common/components'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'

export default function DeveloperSettingsPage() {
    const { assets, modules } = revenge
    const navigation = NavigationNative.useNavigation()

    return (
        <Stack style={{ paddingHorizontal: 16, paddingVertical: 24 }} spacing={16} direction="vertical">
            <TableRowGroup title="Navigation">
                <TableRow
                    label="Test CustomPageRenderer"
                    icon={<TableRowIcon source={assets.getIndexByName('ScreenArrowIcon')} />}
                    onPress={() =>
                        navigation.navigate('RevengeCustomPage', {
                            title: 'Custom Page Test',
                            render: () => null,
                        })
                    }
                />
            </TableRowGroup>
            <TableRowGroup title="Performance">
                <TableRow
                    label="Show Debug Performance Times"
                    icon={<TableRowIcon source={assets.getIndexByName('TimerIcon')} />}
                    onPress={() => navigation.navigate('RevengeDebugPerformanceTimes')}
                />
            </TableRowGroup>
            <TableRowGroup title="Caches">
                <TableRow
                    variant="danger"
                    label="Recreate Metro Cache"
                    subLabel="Module blacklists, lookup flags, asset index maps, asset module ID maps. This will reload the app."
                    icon={<TableRowIcon variant="danger" source={assets.getIndexByName('TrashIcon')} />}
                    onPress={() => {
                        modules.metro.invalidateCache()
                        BundleUpdaterManager.reload()
                    }}
                />
            </TableRowGroup>
        </Stack>
    )
}
