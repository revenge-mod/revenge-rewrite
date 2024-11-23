import { NavigationNative, alerts } from '@revenge-mod/modules/common'
import {
    AlertActionButton,
    AlertModal,
    Stack,
    TableRow,
    TableRowGroup,
    TableRowIcon,
    TextArea,
} from '@revenge-mod/modules/common/components'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'
import { settings } from '@revenge-mod/preferences'
import { useObservable } from '@revenge-mod/storage'

export default function DeveloperSettingsPage() {
    const { assets, modules } = revenge
    const navigation = NavigationNative.useNavigation()
    const evalCodeRef = React.useRef('')

    useObservable([settings])

    return (
        <Stack style={{ paddingHorizontal: 16, paddingVertical: 24 }} spacing={16} direction="vertical">
            <TableRowGroup title="Tools">
                <TableRow
                    label="Evaluate JavaScript"
                    icon={<TableRowIcon source={assets.getIndexByName('PaperIcon')} />}
                    onPress={() => {
                        alerts.openAlert(
                            'revenge.plugins.settings.developer.evaluate',
                            <AlertModal
                                title="Evaluate JavaScript"
                                extraContent={
                                    <TextArea
                                        autoFocus
                                        label="Code"
                                        size="md"
                                        placeholder="ReactNative.NativeModules.BundleUpdaterManager.reload()"
                                        onChange={(v: string) => (evalCodeRef.current = v)}
                                    />
                                }
                                actions={
                                    <Stack>
                                        <AlertActionButton
                                            text="Evaluate"
                                            variant="primary"
                                            onPress={() =>
                                                alert(
                                                    modules.findProp('inspect')(
                                                        // biome-ignore lint/security/noGlobalEval: This is intentional
                                                        globalThis.eval(evalCodeRef.current),
                                                        { depth: 5 },
                                                    ),
                                                )
                                            }
                                        />
                                        <AlertActionButton text="Cancel" variant="secondary" />
                                    </Stack>
                                }
                            />,
                        )
                    }}
                />
            </TableRowGroup>
            <TableRowGroup title="Tests">
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
                <TableRow
                    variant="danger"
                    label="Test ErrorBoundary"
                    icon={<TableRowIcon variant="danger" source={assets.getIndexByName('ScreenXIcon')} />}
                    onPress={() =>
                        navigation.navigate('RevengeCustomPage', {
                            title: 'ErrorBoundary Test',
                            // @ts-expect-error: This will do it
                            render: () => <undefined />,
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
