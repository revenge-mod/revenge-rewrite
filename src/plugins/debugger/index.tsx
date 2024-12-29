import { getAssetIndexByName } from '@revenge-mod/assets'
import type { PluginContextFor } from '@revenge-mod/plugins'
import { sleep } from '@revenge-mod/utils/functions'
import { registerPlugin } from 'libraries/plugins/src/internals'
import DebuggerSettingsPage from './pages/Debugger'
import { connectToDebugger, DebuggerContext } from './debugger'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'

const plugin = registerPlugin<{
    connectOnStartup: boolean
    debuggerUrl: string
}>(
    {
        name: 'Debugger',
        author: 'Revenge',
        description: 'A simple WebSocket debugger for Revenge to make development easier',
        id: 'revenge.debugger',
        version: '1.0.0',
        icon: 'LinkIcon',
        async afterAppRender(context) {
            const {
                revenge: {
                    ui: { settings: sui },
                },
                patcher,
                cleanup,
                storage: { connectOnStartup, debuggerUrl },
            } = context

            if (connectOnStartup) connectToDebugger(debuggerUrl, context)

            // Wait for the section to be added by the Settings plugin
            await sleep(0)

            // biome-ignore lint/suspicious/noExplicitAny: globalThis can be anything
            const win = globalThis as any

            const doCleanup = new Set<() => void>()

            cleanup(
                sui.addRowsToSection('Revenge', {
                    Debugger: {
                        type: 'route',
                        label: 'Debugger',
                        icon: getAssetIndexByName('LinkIcon'),
                        component: () => (
                            <PluginContext.Provider value={context}>
                                <DebuggerSettingsPage />
                            </PluginContext.Provider>
                        ),
                    },
                }),

                (() => {
                    win.debgr = {
                        reload: () => BundleUpdaterManager.reload(),
                        patcher: {
                            // biome-ignore lint/suspicious/noExplicitAny: These arguments can be anything lol
                            snipe: (object: any, key: any, callback?: (args: unknown) => void) => {
                                doCleanup.add(
                                    patcher.after(
                                        object,
                                        key,
                                        callback ?? ((args, ret) => console.log('[SNIPER]', args, ret)),
                                        'debgr.patcher.snipe',
                                    ),
                                )
                            },
                            // biome-ignore lint/suspicious/noExplicitAny: These arguments can be anything lol 2
                            noop: (object: any, key: any) => {
                                doCleanup.add(patcher.instead(object, key, () => void 0, 'debgr.patcher.noop'))
                            },
                            wipe: () => {
                                for (const c of doCleanup) c()
                                doCleanup.clear()
                            },
                        },
                    }

                    return () => (win.debgr = undefined)
                })(),

                () => {
                    for (const c of doCleanup) c()
                },

                patcher.before(
                    win,
                    'nativeLoggingHook',
                    ([message, level]) => {
                        if (DebuggerContext.ws?.readyState === WebSocket.OPEN)
                            DebuggerContext.ws.send(
                                JSON.stringify({
                                    level: level === 3 ? 'error' : level === 2 ? 'warn' : 'info',
                                    message,
                                }),
                            )
                    },
                    'loggerPatch',
                ),
            )
        },
        initializeStorage() {
            return {
                connectOnStartup: false,
                debuggerUrl: 'localhost:9090',
            }
        },
    },
    true,
    true,
)

export type DebuggerContextType = PluginContextFor<typeof plugin, 'AfterAppRender'>
export const PluginContext = React.createContext<DebuggerContextType>(null!)
