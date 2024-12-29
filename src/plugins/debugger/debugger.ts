import { toasts } from '@revenge-mod/modules/common'
import { EventEmitter } from 'events'
import type { DebuggerContextType } from '.'

export const DebuggerEvents = new EventEmitter<DebuggerEventsListeners>()

export type DebuggerEventsListeners = {
    connect: () => void
    disconnect: () => void
    // biome-ignore lint/suspicious/noExplicitAny: Anything can be thrown
    error: (err: any) => void
    // biome-ignore lint/suspicious/noExplicitAny: Anything can be thrown
    '*': (event: keyof DebuggerEventsListeners, err?: any) => void
}

export const DebuggerContext = {
    ws: undefined,
    connected: false,
} as {
    ws: WebSocket | undefined
    connected: boolean
}

export function disconnectFromDebugger() {
    DebuggerContext.ws!.close()
    DebuggerContext.connected = false
}

export function connectToDebugger(addr: string, context: DebuggerContextType) {
    const ws = (DebuggerContext.ws = new WebSocket(`ws://${addr}`))

    ws.addEventListener('open', () => {
        DebuggerContext.connected = true
        DebuggerEvents.emit('connect')
        DebuggerEvents.emit('*', 'connect')

        toasts.open({
            key: 'revenge.debugger.connected',
            content: 'Connected to debugger!',
        })
    })

    ws.addEventListener('close', () => {
        DebuggerContext.connected = false
        DebuggerEvents.emit('disconnect')
        DebuggerEvents.emit('*', 'disconnect')

        toasts.open({
            key: 'revenge.debugger.disconnected',
            content: 'Disconnected from debugger!',
        })
    })

    ws.addEventListener('error', e => {
        DebuggerContext.connected = false
        DebuggerEvents.emit('error', e)
        DebuggerEvents.emit('*', 'error', e)

        toasts.open({
            key: 'revenge.debugger.errored',
            content: 'Debugger errored!',
        })
    })

    ws.addEventListener('message', e => {
        try {
            const json = JSON.parse(e.data) as {
                code: string
                nonce: string
            }

            if (typeof json.code === 'string' && typeof json.nonce === 'string') {
                let res: unknown
                try {
                    // biome-ignore lint/security/noGlobalEval: This is intentional
                    res = globalThis.eval(json.code)
                } catch (e) {
                    res = e
                }

                const inspect =
                    context.revenge.modules.findProp<
                        (val: unknown, opts?: { depth?: number; showHidden?: boolean; color?: boolean }) => string
                    >('inspect')!

                try {
                    if (res instanceof Error)
                        ws.send(
                            JSON.stringify({
                                level: 'error',
                                message: String(res),
                                nonce: json.nonce,
                            }),
                        )
                    else {
                        ws.send(
                            JSON.stringify({
                                level: 'info',
                                message: inspect(res, { showHidden: true }),
                                nonce: json.nonce,
                            }),
                        )
                    }
                } catch (e) {
                    ws.send(
                        JSON.stringify({
                            level: 'error',
                            message: `DebuggerInternalError: ${String(e)}`,
                            nonce: json.nonce,
                        }),
                    )
                }
            }
        } catch {}
    })
}
