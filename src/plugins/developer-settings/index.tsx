/// <reference path="./debugger.d.ts" />

import { toasts } from '@revenge-mod/modules/common'
import { registerPlugin } from '@revenge-mod/plugins/internals'
import { sleep } from '@revenge-mod/utils/functions'

import AssetBrowserSettingsPage from './pages/AssetBrowser'
import DebugPerformanceTimesSettingsPage from './pages/DebugPerformanceTimes'
import DeveloperSettingsPage from './pages/Developer'

import { DebuggerContext, connectToDebugger } from './debugger'
import { DevToolsEvents, connectToDevTools } from './devtools'

import { BundleUpdaterManager } from '@revenge-mod/modules/native'
import type { PluginContextFor } from '@revenge-mod/plugins'
import type { FunctionComponent } from 'react'

const plugin = registerPlugin<{
    reactDevTools: {
        address: string
        autoConnect: boolean
    }
    debugger: {
        address: string
        autoConnect: boolean
    }
}>(
    {
        name: 'Developer Settings',
        author: 'Revenge',
        description: 'Developer settings for Revenge',
        id: 'revenge.developer-settings',
        version: '1.0.0',
        icon: 'WrenchIcon',
    },
    {
        async afterAppRender(context) {
            const {
                cleanup,
                storage,
                revenge: {
                    assets,
                    ui: { settings: sui },
                },
            } = context

            function wrapPluginContext(Component: FunctionComponent) {
                return () => (
                    <PluginContext.Provider value={context}>
                        <Component />
                    </PluginContext.Provider>
                )
            }

            DevToolsEvents.on('error', err =>
                toasts.open({
                    key: 'revenge.plugins.settings.react-devtools.error',
                    content: `Error while connecting to React DevTools:\n${err.message}`,
                }),
            )

            DevToolsEvents.on('connect', () =>
                toasts.open({
                    key: 'revenge.plugins.settings.react-devtools.connected',
                    content: 'Connected to React DevTools',
                }),
            )

            if (storage.reactDevTools.autoConnect && globalThis.__reactDevTools)
                connectToDevTools(storage.reactDevTools.address)
            if (storage.debugger.autoConnect) connectToDebugger(storage.debugger.address, context.revenge)

            setupDebugger(context)

            // Wait for the section to be added by the Settings plugin
            await sleep(0)

            cleanup(
                sui.addRowsToSection('Revenge', {
                    RevengeDeveloper: {
                        type: 'route',
                        label: 'Developer',
                        icon: assets.getIndexByName('WrenchIcon'),
                        component: wrapPluginContext(DeveloperSettingsPage),
                    },
                }),

                sui.createRoute('RevengeDebugPerformanceTimes', {
                    type: 'route',
                    label: 'Debug Performance Times',
                    component: DebugPerformanceTimesSettingsPage,
                    icon: assets.getIndexByName('TimerIcon'),
                }),

                sui.createRoute('RevengeAssetBrowser', {
                    type: 'route',
                    label: 'Asset Browser',
                    component: AssetBrowserSettingsPage,
                    icon: assets.getIndexByName('ImageIcon'),
                }),
            )
        },
        initializeStorage: () => ({
            reactDevTools: {
                address: 'localhost:8097',
                autoConnect: false,
            },
            debugger: {
                address: 'localhost:9090',
                autoConnect: false,
            },
        }),
    },
    {
        external: false,
        manageable: true,
        enabled: false,
    },
)

function setupDebugger({ patcher, cleanup }: PluginContextFor<typeof plugin, 'AfterAppRender'>) {
    const debuggerCleanups = new Set<() => unknown>()

    patcher.before(
        globalThis,
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
    )

    globalThis.reload = () => BundleUpdaterManager.reload()
    globalThis.patcher = {
        snipe: (object, key, callback) =>
            debuggerCleanups.add(
                patcher.after(
                    object,
                    key,
                    callback ?? ((args, ret) => console.log('[SNIPER]', args, ret)),
                    'revenge.plugins.developer-settings.debugger.patcher.snipe',
                ),
            ),
        noop: (object, key) =>
            debuggerCleanups.add(
                patcher.instead(object, key, () => void 0, 'revenge.plugins.developer-settings.debugger.patcher.noop'),
            ),
        wipe: () => {
            for (const c of debuggerCleanups) c()
            debuggerCleanups.clear()
        },
    }

    cleanup(
        () => {
            // biome-ignore lint/performance/noDelete: This happens once
            delete globalThis.reload
            // biome-ignore lint/performance/noDelete: This happens once
            delete globalThis.patcher
        },
        () => {
            for (const c of debuggerCleanups) c()
        },
    )
}

export const PluginContext = React.createContext<PluginContextFor<typeof plugin, 'AfterAppRender'>>(null!)
