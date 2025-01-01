import { EventEmitter } from 'events'
import type { RevengeLibrary } from '@revenge-mod/revenge'

export const DebuggerEvents = new EventEmitter<DebuggerEventsListeners>()

export type DebuggerEventsListeners = {
    connect: () => void
    disconnect: () => void
    error: (err: any) => void
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

export function connectToDebugger(addr: string, revenge: RevengeLibrary) {
    const ws = (DebuggerContext.ws = new WebSocket(`ws://${addr}`))

    ws.addEventListener('open', () => {
        DebuggerContext.connected = true
        DebuggerEvents.emit('connect')
        DebuggerEvents.emit('*', 'connect')
    })

    ws.addEventListener('close', () => {
        DebuggerContext.connected = false
        DebuggerEvents.emit('disconnect')
        DebuggerEvents.emit('*', 'disconnect')
    })

    ws.addEventListener('error', e => {
        DebuggerContext.connected = false
        DebuggerEvents.emit('error', e)
        DebuggerEvents.emit('*', 'error', e)
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
                    revenge.modules.findProp<
                        (val: unknown, opts?: { depth?: number; showHidden?: boolean; color?: boolean }) => string
                    >('inspect')!

                try {
                    ws.send(
                        res instanceof Error
                            ? JSON.stringify({
                                  level: 'error',
                                  message: String(res),
                                  nonce: json.nonce,
                              })
                            : JSON.stringify({
                                  level: 'info',
                                  message: inspect(res, { showHidden: true }),
                                  nonce: json.nonce,
                              }),
                    )
                } catch (e) {
                    ws.send(
                        JSON.stringify({
                            level: 'error',
                            message: `DebuggerError: ${String(e)}`,
                            nonce: json.nonce,
                        }),
                    )
                }
            }
        } catch {}
    })
}
