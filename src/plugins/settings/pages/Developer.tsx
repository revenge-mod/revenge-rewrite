import { EventEmitter, NavigationNative, alerts, toasts } from '@revenge-mod/modules/common'
import {
    AlertActionButton,
    AlertModal,
    Stack,
    TableRow,
    TableRowGroup,
    TableRowIcon,
    TableSwitchRow,
    TextArea,
    TextField,
} from '@revenge-mod/modules/common/components'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'
import { settings } from '@revenge-mod/preferences'
import { storageContextSymbol, useObservable } from '@revenge-mod/storage'

import PageWrapper from './(Wrapper)'

import ReactIcon from '../../../assets/react.webp'

const devToolsEmitter = new EventEmitter<{
    connect: () => void
    error: (err: any) => void
    
}>()

export default function DeveloperSettingsPage() {
    useObservable([settings])
    const [, forceUpdate] = React.useReducer(x => ~x, 0)

    const { assets, modules } = revenge
    const navigation = NavigationNative.useNavigation()
    const evalCodeRef = React.useRef('')
    const devToolsAddrRef = React.useRef(settings.developer.reactDevTools.address || 'localhost:8097')

    return (
        <PageWrapper>
            <Stack style={{ paddingHorizontal: 16, paddingVertical: 24 }} spacing={16} direction="vertical">
                {typeof __reactDevTools !== 'undefined' && (
                    <Stack spacing={8} direction="vertical">
                        <TextField
                            editable={!devToolsContext.connected}
                            isDisabled={devToolsContext.connected}
                            leadingText="ws://"
                            defaultValue={devToolsAddrRef.current}
                            label="React DevTools"
                            onChange={text => (devToolsAddrRef.current = text)}
                            onBlur={() => {
                                if (devToolsAddrRef.current === settings.developer.reactDevTools.address) return
                                settings.developer.reactDevTools.address = devToolsAddrRef.current
                                toasts.open({
                                    key: 'revenge.plugins.settings.react-devtools.saved',
                                    content: 'Saved DevTools address!',
                                })
                            }}
                            returnKeyType="done"
                        />
                        <TableRowGroup>
                            {devToolsContext.connected ? (
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
                                    onPress={() => connectToDevTools(devToolsAddrRef.current, forceUpdate)}
                                />
                            )}
                            <TableSwitchRow
                                label="Auto Connect on Startup"
                                subLabel="Automatically connect to React DevTools when the app starts."
                                icon={<TableRowIcon source={{ uri: ReactIcon }} />}
                                value={settings.developer.reactDevTools.autoConnect}
                                onValueChange={v => (settings.developer.reactDevTools.autoConnect = v)}
                            />
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
        </PageWrapper>
    )
}

export const devToolsContext = {
    ws: undefined,
    connected: false,
    error: undefined,
} as {
    ws: WebSocket | undefined
    connected: boolean
    // biome-ignore lint/suspicious/noExplicitAny: Anything can be thrown
    error?: any
}

export function disconnectFromDevTools() {
    devToolsContext.ws!.close()
    devToolsContext.connected = false
}

export function connectToDevTools(addr: string, onUpdate: () => void) {
    const ws = (devToolsContext.ws = new WebSocket(`ws://${addr}`))

    ws.addEventListener('open', () => {
        devToolsContext.connected = true
        onUpdate()
    })

    ws.addEventListener('close', () => {
        devToolsContext.connected = false
        onUpdate()
    })

    ws.addEventListener('error', err => {
        devToolsContext.connected = false

        toasts.open({
            key: 'revenge.plugins.settings.react-devtools.error',
            content: `Error while connecting to React DevTools:\n${err.message}`,
        })

        onUpdate()
    })

    __reactDevTools!.exports.connectToDevTools({
        websocket: ws,
    })
}
