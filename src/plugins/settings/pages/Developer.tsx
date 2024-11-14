import { Stack, TableRow, TableRowGroup, TableRowIcon } from '@revenge-mod/modules/common/components'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'

export default function DeveloperSettingsPage() {
    const { assets, modules } = revenge

    return (
        <Stack style={{ paddingHorizontal: 16, paddingVertical: 24 }} spacing={16} direction="vertical">
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
