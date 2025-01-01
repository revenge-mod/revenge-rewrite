import { EventEmitter } from 'events'

export const DevToolsEvents = new EventEmitter<DevToolsEventsListeners>()

export type DevToolsEventsListeners = {
    connect: () => void
    disconnect: () => void
    error: (err: any) => void
    '*': (event: keyof DevToolsEventsListeners, err?: any) => void
}

export const DevToolsContext = {
    ws: undefined,
    connected: false,
    error: undefined,
} as {
    ws: WebSocket | undefined
    connected: boolean
    error?: any
}

export function disconnectFromDevTools() {
    DevToolsContext.ws!.close()
    DevToolsContext.connected = false
}

export function connectToDevTools(addr: string) {
    const ws = (DevToolsContext.ws = new WebSocket(`ws://${addr}`))

    ws.addEventListener('open', () => {
        DevToolsContext.connected = true
        DevToolsEvents.emit('connect')
        DevToolsEvents.emit('*', 'connect')
    })

    ws.addEventListener('close', () => {
        DevToolsContext.connected = false
        DevToolsEvents.emit('disconnect')
        DevToolsEvents.emit('*', 'disconnect')
    })

    ws.addEventListener('error', e => {
        DevToolsContext.connected = false
        DevToolsEvents.emit('error', e)
        DevToolsEvents.emit('*', 'error', e)
    })

    __reactDevTools!.exports.connectToDevTools({
        websocket: ws,
    })
}
