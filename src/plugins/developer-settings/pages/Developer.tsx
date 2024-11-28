import { NavigationNative, alerts, toasts } from '@revenge-mod/modules/common'
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
import { storageContextSymbol, useObservable } from '@revenge-mod/storage'

import PageWrapper from '../../../plugins/settings/pages/(Wrapper)'

import {
    DevToolsContext,
    DevToolsEvents,
    type DevToolsEventsListeners,
    connectToDevTools,
    disconnectFromDevTools,
} from '../devtools'

import ReactIcon from '../../../assets/react.webp'

import { settings } from '@revenge-mod/preferences'
import { PluginContext } from '..'

export default function DeveloperSettingsPage() {
    const {
        storage,
        revenge: { assets, modules },
    } = React.useContext(PluginContext)

    useObservable([storage])

    const navigation = NavigationNative.useNavigation()

    const refEvalCode = React.useRef('')
    const refDevToolsAddr = React.useRef(storage.reactDevTools.address || 'localhost:8097')

    const [connected, setConnected] = React.useState(DevToolsContext.connected)

    React.useEffect(() => {
        const listener: DevToolsEventsListeners['*'] = evt => {
            if (evt === 'connect') setConnected(true)
            else setConnected(false)
        }

        DevToolsEvents.on('*', listener)

        return () => void DevToolsEvents.off('*', listener)
    }, [])

    return (
        <PageWrapper>
            <Stack style={{ paddingHorizontal: 16, paddingVertical: 24 }} spacing={16} direction="vertical">
                {typeof __reactDevTools !== 'undefined' && (
                    <Stack spacing={8} direction="vertical">
                        <TextInput
                            editable={!connected}
                            isDisabled={connected}
                            leadingText="ws://"
                            defaultValue={refDevToolsAddr.current}
                            label="React DevTools"
                            onChange={text => (refDevToolsAddr.current = text)}
                            onBlur={() => {
                                if (refDevToolsAddr.current === storage.reactDevTools.address) return
                                storage.reactDevTools.address = refDevToolsAddr.current

                                toasts.open({
                                    key: 'revenge.plugins.settings.react-devtools.saved',
                                    content: 'Saved DevTools address!',
                                })
                            }}
                            returnKeyType="done"
                        />
                        <TableRowGroup>
                            {connected ? (
                                <TableRow
                                    label="Disconnect from React DevTools"
                                    variant="danger"
                                    icon={<TableRowIcon variant="danger" source={{ uri: ReactIcon }} />}
                                    onPress={() => disconnectFromDevTools()}
                                />
                            ) : (
                                <TableRow
                                    label={'Connect to React DevTools'}
                                    icon={<TableRowIcon source={{ uri: ReactIcon }} />}
                                    onPress={() => connectToDevTools(refDevToolsAddr.current)}
                                />
                            )}
                            <TableSwitchRow
                                label="Auto Connect on Startup"
                                subLabel="Automatically connect to React DevTools when the app starts."
                                icon={<TableRowIcon source={{ uri: ReactIcon }} />}
                                value={storage.reactDevTools.autoConnect}
                                onValueChange={v => (storage.reactDevTools.autoConnect = v)}
                            />
                        </TableRowGroup>
                    </Stack>
                )}
                <TableRowGroup title="Tools">
                    <TableRow
                        label="Evaluate JavaScript"
                        icon={<TableRowIcon source={assets.getIndexByName('PaperIcon')} />}
                        onPress={() => {
                            alerts.openAlert(
                                'revenge.plugins.storage.evaluate',
                                <AlertModal
                                    title="Evaluate JavaScript"
                                    extraContent={
                                        <TextArea
                                            autoFocus
                                            label="Code"
                                            size="md"
                                            placeholder="ReactNative.NativeModules.BundleUpdaterManager.reload()"
                                            onChange={(v: string) => (refEvalCode.current = v)}
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
                                                            globalThis.eval(refEvalCode.current),
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
                    <TableRow
                        label="Asset Browser"
                        icon={<TableRowIcon source={assets.getIndexByName('ImageIcon')} />}
                        arrow
                        onPress={() => navigation.navigate('RevengeAssetBrowser')}
                    />
                    <TableRow
                        variant="danger"
                        label="Clear Settings"
                        subLabel="This will remove the settings file and reload the app."
                        icon={<TableRowIcon variant="danger" source={assets.getIndexByName('TrashIcon')} />}
                        onPress={async () => {
                            await settings[storageContextSymbol].file.delete()
                            BundleUpdaterManager.reload()
                        }}
                    />
                </TableRowGroup>
                <TableRowGroup title="Tests">
                    <TableRow
                        label="Test CustomPageRenderer"
                        icon={<TableRowIcon source={assets.getIndexByName('ScreenArrowIcon')} />}
                        arrow
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
                        arrow
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
        </PageWrapper>
    )
}
