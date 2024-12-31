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
import { BundleUpdaterManager, FileModule } from '@revenge-mod/modules/native'
import { storageContextSymbol, useObservable } from '@revenge-mod/storage'

import PageWrapper from '../../../plugins/settings/pages/(Wrapper)'

import {
    DevToolsContext,
    DevToolsEvents,
    type DevToolsEventsListeners,
    connectToDevTools,
    disconnectFromDevTools,
} from '../devtools'
import {
    connectToDebugger,
    DebuggerContext,
    DebuggerEvents,
    disconnectFromDebugger,
    type DebuggerEventsListeners,
} from '../debugger'

import { settings } from '@revenge-mod/preferences'
import { ScrollView } from 'react-native'
import { PluginContext } from '..'
import { useContext, useEffect, useRef, useState } from 'react'
import { PluginsDirectoryPath } from '@revenge-mod/shared/paths'

export default function DeveloperSettingsPage() {
    const context = useContext(PluginContext)
    const {
        storage,
        revenge: { assets, modules },
    } = context

    useObservable([storage])

    const navigation = NavigationNative.useNavigation()

    const refDevToolsAddr = useRef(storage.reactDevTools.address || 'localhost:8097')
    const [rdtConnected, setRdtConnected] = useState(DevToolsContext.connected)

    const refDebuggerAddr = useRef(storage.debugger.address || 'localhost:9090')
    const [dbgConnected, setDbgConnected] = useState(DebuggerContext.connected)

    useEffect(() => {
        const listener: DevToolsEventsListeners['*'] = evt => {
            if (evt === 'connect') setRdtConnected(true)
            else setRdtConnected(false)
        }

        DevToolsEvents.on('*', listener)

        return () => void DevToolsEvents.off('*', listener)
    }, [])

    useEffect(() => {
        const listener: DebuggerEventsListeners['*'] = evt => {
            if (evt === 'connect') setDbgConnected(true)
            else setDbgConnected(false)
        }

        DebuggerEvents.on('*', listener)

        return () => void DebuggerEvents.off('*', listener)
    }, [])

    return (
        <ScrollView>
            <PageWrapper>
                <Stack spacing={8} direction="vertical">
                    {typeof __reactDevTools !== 'undefined' && (
                        <>
                            <TextInput
                                editable={!rdtConnected}
                                isDisabled={rdtConnected}
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
                            {/* Rerender when connected changes */}
                            <TableRowGroup key={String(rdtConnected)}>
                                {rdtConnected ? (
                                    <TableRow
                                        label="Disconnect from React DevTools"
                                        variant="danger"
                                        icon={
                                            <TableRowIcon
                                                variant="danger"
                                                source={assets.getIndexByName('Revenge.ReactIcon')!}
                                            />
                                        }
                                        onPress={() => disconnectFromDevTools()}
                                    />
                                ) : (
                                    <TableRow
                                        label="Connect to React DevTools"
                                        icon={<TableRowIcon source={assets.getIndexByName('Revenge.ReactIcon')!} />}
                                        onPress={() => connectToDevTools(refDevToolsAddr.current)}
                                    />
                                )}
                                <TableSwitchRow
                                    label="Auto Connect on Startup"
                                    subLabel="Automatically connect to React DevTools when the app starts."
                                    icon={<TableRowIcon source={assets.getIndexByName('Revenge.ReactIcon')!} />}
                                    value={storage.reactDevTools.autoConnect}
                                    onValueChange={v => (storage.reactDevTools.autoConnect = v)}
                                />
                            </TableRowGroup>
                        </>
                    )}
                    <TextInput
                        editable={!dbgConnected}
                        isDisabled={dbgConnected}
                        leadingText="ws://"
                        defaultValue={refDebuggerAddr.current}
                        label="Debugger"
                        onChange={text => (refDebuggerAddr.current = text)}
                        onBlur={() => {
                            if (refDebuggerAddr.current === storage.debugger.address) return
                            storage.debugger.address = refDebuggerAddr.current

                            toasts.open({
                                key: 'revenge.plugins.developer-settings.debugger.saved',
                                content: 'Saved debugger address!',
                            })
                        }}
                        returnKeyType="done"
                    />
                    {/* Rerender when connected changes */}
                    <TableRowGroup key={String(dbgConnected)}>
                        {dbgConnected ? (
                            <TableRow
                                label="Disconnect from debugger"
                                variant="danger"
                                icon={<TableRowIcon variant="danger" source={assets.getIndexByName('LinkIcon')!} />}
                                onPress={() => disconnectFromDebugger()}
                            />
                        ) : (
                            <TableRow
                                label="Connect to debugger"
                                icon={<TableRowIcon source={assets.getIndexByName('LinkIcon')!} />}
                                onPress={() => connectToDebugger(storage.debugger.address, context.revenge)}
                            />
                        )}
                        <TableSwitchRow
                            label="Auto Connect on Startup"
                            subLabel="Automatically connect to debugger when the app starts."
                            icon={<TableRowIcon source={assets.getIndexByName('LinkIcon')!} />}
                            value={storage.debugger.autoConnect}
                            onValueChange={v => (storage.debugger.autoConnect = v)}
                        />
                    </TableRowGroup>
                </Stack>
                <TableRowGroup title="Tools">
                    <TableRow
                        label="Evaluate JavaScript"
                        icon={<TableRowIcon source={assets.getIndexByName('PaperIcon')!} />}
                        onPress={() => {
                            alerts.openAlert(
                                'revenge.plugins.storage.evaluate',
                                <PluginContext.Provider value={context}>
                                    <DeveloperSettingsPageEvaluateJavaScriptAlert />
                                </PluginContext.Provider>,
                            )
                        }}
                    />
                    <TableRow
                        label="Asset Browser"
                        icon={<TableRowIcon source={assets.getIndexByName('ImageIcon')!} />}
                        arrow
                        onPress={() => navigation.navigate('RevengeAssetBrowser')}
                    />
                    <TableRow
                        variant="danger"
                        label="Clear Settings"
                        subLabel="This will remove the settings file and reload the app."
                        icon={<TableRowIcon variant="danger" source={assets.getIndexByName('TrashIcon')!} />}
                        onPress={async () => {
                            await settings[storageContextSymbol].file.delete()
                            BundleUpdaterManager.reload()
                        }}
                    />
                    <TableRow
                        variant="danger"
                        label="Clear Plugins Data"
                        subLabel="This will remove the all plugin-related data and reload the app."
                        icon={<TableRowIcon variant="danger" source={assets.getIndexByName('TrashIcon')!} />}
                        onPress={async () => {
                            await FileModule.clearFolder('documents', PluginsDirectoryPath)
                            BundleUpdaterManager.reload()
                        }}
                    />
                </TableRowGroup>
                <TableRowGroup title="Tests">
                    <TableRow
                        label="Test CustomPageRenderer"
                        icon={<TableRowIcon source={assets.getIndexByName('ScreenArrowIcon')!} />}
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
                        icon={<TableRowIcon variant="danger" source={assets.getIndexByName('ScreenXIcon')!} />}
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
                        icon={<TableRowIcon source={assets.getIndexByName('TimerIcon')!} />}
                        onPress={() => navigation.navigate('RevengeDebugPerformanceTimes')}
                    />
                </TableRowGroup>
                <TableRowGroup title="Caches">
                    <TableRow
                        variant="danger"
                        label="Recreate Metro Cache"
                        subLabel="Module blacklists, lookup flags, asset index maps, asset module ID maps. This will reload the app."
                        icon={<TableRowIcon variant="danger" source={assets.getIndexByName('TrashIcon')!} />}
                        onPress={() => {
                            modules.metro.invalidateCache()
                            BundleUpdaterManager.reload()
                        }}
                    />
                </TableRowGroup>
            </PageWrapper>
        </ScrollView>
    )
}

function DeveloperSettingsPageEvaluateJavaScriptAlert() {
    const {
        revenge: { modules },
    } = useContext(PluginContext)

    const [evalAwaitResult, setEvalAwaitResult] = useState(true)
    const codeRef = useRef('')

    return (
        <AlertModal
            title="Evaluate JavaScript"
            extraContent={
                <Stack>
                    <TextArea
                        autoFocus
                        label="Code"
                        size="md"
                        placeholder="ReactNative.NativeModules.BundleUpdaterManager.reload()"
                        onChange={(v: string) => (codeRef.current = v)}
                    />
                    <TableRowGroup>
                        <TableSwitchRow
                            label="Await result"
                            value={evalAwaitResult}
                            onValueChange={v => setEvalAwaitResult(v)}
                        />
                    </TableRowGroup>
                </Stack>
            }
            actions={
                <Stack>
                    <AlertActionButton
                        text="Evaluate"
                        variant="primary"
                        onPress={async () => {
                            // biome-ignore lint/security/noGlobalEval: This is intentional
                            const res = globalThis.eval(codeRef.current)

                            alert(
                                modules.findProp<(val: unknown, opts?: { depth?: number }) => string>('inspect')!(
                                    res instanceof Promise && evalAwaitResult ? await res : res,
                                    { depth: 5 },
                                ),
                            )
                        }}
                    />
                    <AlertActionButton text="Cancel" variant="secondary" />
                </Stack>
            }
        />
    )
}
