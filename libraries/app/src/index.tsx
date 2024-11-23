import { recordTimestamp } from '@revenge-mod/debug'
import { findByName } from '@revenge-mod/modules/finders'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'
import { createPatcherInstance } from '@revenge-mod/patcher'

import type { Component, FC, ReactNode } from 'react'

const patcher = createPatcherInstance('revenge.library.app')

const initializeCallbacks = new Set<AppGenericCallback>()
const renderCallbacks = new Set<AppGenericCallback>()

export let isAppInitialized = false
export let isAppRendered = false

export function afterAppInitialized(callback: AppGenericCallback) {
    if (isAppInitialized) throw new Error('Cannot attach a callback after the app has already been initialized')
    initializeCallbacks.add(callback)
}

export function afterAppRendered(callback: AppGenericCallback) {
    if (isAppRendered) throw new Error('Cannot attach a callback after the App component has been rendered')
    renderCallbacks.add(callback)
}

afterAppInitialized(() => (isAppInitialized = true))
afterAppRendered(() => (isAppRendered = true))

const unpatchRunApplication = patcher.after(
    ReactNative.AppRegistry,
    'runApplication',
    () => {
        unpatchRunApplication()
        recordTimestamp('App_RunApplicationCalled')
        for (const callback of initializeCallbacks) callback()
        recordTimestamp('App_AfterRunCallbacks')
    },
    'runInitializeCallbacks',
)

const unpatchCreateElement = patcher.after(
    React,
    'createElement',
    () => {
        unpatchCreateElement()
        recordTimestamp('App_CreateElementCalled')
        for (const callback of renderCallbacks) callback()
    },
    'runRenderCallbacks',
)

const unpatchRegisterComponent = patcher.before(
    ReactNative.AppRegistry,
    'registerComponent',
    () => {
        unpatchRegisterComponent()

        setImmediate(async () => {
            const { default: Screen } = await import('./components/ErrorBoundaryScreen')

            patcher.after.await(
                findByName.async('ErrorBoundary').then(it => it.prototype as ErrorBoundaryComponentPrototype),
                'render',
                function (this: ErrorBoundaryComponentPrototype) {
                    if (this.state.error)
                        return (
                            <Screen
                                error={this.state.error}
                                rerender={() => this.setState({ error: null, info: null })}
                                reload={this.handleReload}
                            />
                        )
                },
            )
        })
    },
    'patchErrorBoundary',
)

export const AppLibrary = {
    /**
     * Whether the app has finished initializing
     */
    get initialized() {
        return isAppInitialized
    },
    /**
     * Whether the App component has been rendered
     */
    get rendered() {
        return isAppRendered
    },
    /**
     * Attaches a callback to be called when the app has been rendered
     * @param callback The callback to be called
     */
    afterRendered: afterAppRendered,
    /**
     * Attaches a callback to be called when the app has been initialized
     * @param callback The callback to be called
     */
    afterInitialized: afterAppInitialized,
    /**
     * Reloads the app
     */
    reload: () => BundleUpdaterManager.reload(),
}

export type AppLibrary = typeof AppLibrary

export type ErrorBoundaryComponentPrototype = Component<
    { children: ReactNode },
    {
        error: (Error & { componentStack?: string }) | unknown | null
        info: { componentStack?: string } | null
    }
> & {
    discordErrorsSet: boolean
    handleReload(): void
}

export type AppComponentModuleType = { default: FC }
export type AppGenericCallback = () => void
export type AppErroredCallback = (error: unknown) => void
