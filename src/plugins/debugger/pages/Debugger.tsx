import { useContext, useEffect, useRef, useState } from 'react'
import { PluginContext } from '..'
import { useObservable } from '@revenge-mod/storage'
import { ScrollView } from 'react-native'
import PageWrapper from 'src/plugins/settings/pages/(Wrapper)'
import {
    Stack,
    TableRow,
    TableRowGroup,
    TableRowIcon,
    TableSwitchRow,
    TextInput,
} from '@revenge-mod/modules/common/components'
import { toasts } from '@revenge-mod/modules/common'
import {
    connectToDebugger,
    DebuggerContext,
    DebuggerEvents,
    disconnectFromDebugger,
    type DebuggerEventsListeners,
} from '../debugger'

export default function DebuggerSettingsPage() {
    const context = useContext(PluginContext)
    const {
        storage,
        revenge: { assets },
    } = context
    useObservable([storage])

    const tempDebuggerUrl = useRef(storage.debuggerUrl || 'localhost:9090')
    const [connected, setConnected] = useState(DebuggerContext.connected)

    useEffect(() => {
        const listener: DebuggerEventsListeners['*'] = evt => {
            if (evt === 'connect') setConnected(true)
            else setConnected(false)
        }

        DebuggerEvents.on('*', listener)

        return () => void DebuggerEvents.off('*', listener)
    }, [])

    return (
        <ScrollView>
            <PageWrapper>
                <Stack spacing={8}>
                    <TextInput
                        editable={!connected}
                        isDisabled={connected}
                        leadingText="ws://"
                        defaultValue={tempDebuggerUrl.current}
                        label="React DevTools"
                        onChange={text => (tempDebuggerUrl.current = text)}
                        onBlur={() => {
                            if (tempDebuggerUrl.current === storage.debuggerUrl) return
                            storage.debuggerUrl = tempDebuggerUrl.current

                            toasts.open({
                                key: 'revenge.debugger.savedurl',
                                content: 'Saved debugger URL!',
                            })
                        }}
                        returnKeyType="done"
                    />
                    {/* Rerender when connected changes */}
                    <TableRowGroup key={String(connected)}>
                        {connected ? (
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
                                onPress={() => connectToDebugger(storage.debuggerUrl, context)}
                            />
                        )}
                        <TableSwitchRow
                            label="Auto Connect on Startup"
                            subLabel="Automatically connect to debugger when the app starts."
                            icon={<TableRowIcon source={assets.getIndexByName('LinkIcon')!} />}
                            value={storage.connectOnStartup}
                            onValueChange={v => (storage.connectOnStartup = v)}
                        />
                    </TableRowGroup>
                </Stack>
            </PageWrapper>
        </ScrollView>
    )
}
