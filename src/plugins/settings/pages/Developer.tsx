import { NavigationNative, alerts } from '@revenge-mod/modules/common'
import {
    AlertActionButton,
    AlertModal,
    Stack,
    TableRow,
    TableRowGroup,
    TableRowIcon,
    TableSwitchRow,
    TextArea,
    TextInput,
} from '@revenge-mod/modules/common/components'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'
import { settings } from '@revenge-mod/preferences'
import { useObservable } from '@revenge-mod/storage'

import ReactIcon from '../../../assets/react.webp'

let devToolsWs: WebSocket | undefined
let devToolsConnected = false

export default function DeveloperSettingsPage() {
    const { assets, modules } = revenge
    const navigation = NavigationNative.useNavigation()
    const evalCodeRef = React.useRef('')
    const devToolsAddrRef = React.useRef('localhost:8097')

    useObservable([settings])

    const [, forceUpdate] = React.useReducer(x => ~x, 0)

    return (
        <Stack style={{ paddingHorizontal: 16, paddingVertical: 24 }} spacing={16} direction="vertical">
            {typeof __reactDevTools !== 'undefined' && (
                <Stack spacing={8} direction='vertical'>
                    <TextInput
                        editable={!devToolsConnected}
                        isDisabled={devToolsConnected}
                        leadingText="ws://"
                        defaultValue="localhost:8097"
                        label="React DevTools"
                        onChangeText={text => (devToolsAddrRef.current = text)}
                    />
                    <TableRowGroup>
                        {devToolsConnected ? (
                            <TableRow
                                label="Disconnect from React DevTools"
                                variant="danger"
                                icon={<TableRowIcon variant="danger" source={{ uri: ReactIcon }} />}
                                onPress={() => {
                                    devToolsWs!.close()
                                    devToolsConnected = false
                                    forceUpdate()
                                }}
                            />
                        ) : (
                            <TableRow
                                label={'Connect to React DevTools'}
                                icon={<TableRowIcon source={{ uri: ReactIcon }} />}
                                onPress={() => {
                                    devToolsWs = new WebSocket(`ws://${devToolsAddrRef.current}`)
                                    devToolsWs.addEventListener('open', () => {
                                        devToolsConnected = true
                                        forceUpdate()
                                    })

                                    __reactDevTools!.exports.connectToDevTools({
                                        websocket: devToolsWs,
                                    })
                                }}
                            />
                        )}
                    </TableRowGroup>
                </Stack>
            )}
            <TableRowGroup title="Tools">
                <TableSwitchRow
                    label="Patch ErrorBoundary"
                    subLabel="Allows you to see a more detailed error screen, but may slow down the app during startup."
                    icon={<TableRowIcon source={assets.getIndexByName('ScreenXIcon')} />}
                    value={settings.developer.patchErrorBoundary}
                    onValueChange={v => (settings.developer.patchErrorBoundary = v)}
                />
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
                                                    modules.findProp<
                                                        (val: unknown, opts?: { depth?: number }) => string
                                                    >('inspect')!(
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
