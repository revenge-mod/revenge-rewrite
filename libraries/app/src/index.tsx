import { recordTimestamp } from '@revenge-mod/debug'
import { findByName } from '@revenge-mod/modules/finders'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'
import { createPatcherInstance } from '@revenge-mod/patcher'
import { createLogger } from '@revenge-mod/utils/library'

import type { Component, FC, ReactNode } from 'react'

const patcher = createPatcherInstance('revenge.library.app')
const logger = createLogger('app')

logger.log('Library loaded')

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
        logger.log('AppRegistry.runApplication called')

        for (const callback of initializeCallbacks) callback()

        recordTimestamp('App_AfterRunCallbacks')
        logger.log('Initialized callbacks called')
    },
    'runInitializeCallbacks',
)

const unpatchCreateElement = patcher.after(
    React,
    'createElement',
    () => {
        unpatchCreateElement()

        recordTimestamp('App_CreateElementCalled')
        logger.log('React.createElement called')

        for (const callback of renderCallbacks) callback()

        logger.log('Rendered callbacks called')
    },
    'runRenderCallbacks',
)

let resolveErrorBoundaryPatched: () => void
export const errorBoundaryPatchedPromise = new Promise<void>(resolve => (resolveErrorBoundaryPatched = resolve))

// Patching ErrorBoundary afterInitialized causes the weird "Element type is invalid" error due to TextInputWrapper
const afterErrorBoundaryPatchable = ReactNative.Platform.OS === 'ios' ? afterAppRendered : afterAppInitialized

afterErrorBoundaryPatchable(async function patchErrorBoundary() {
    const { default: Screen } = await import('./components/ErrorBoundaryScreen')

    setImmediate(() => {
        patcher.after.await(
            findByName.async<ErrorBoundaryComponentPrototype, true>('ErrorBoundary').then(it => it!.prototype),
            'render',
            function () {
                if (this.state.error)
                    return (
                        <Screen
                            error={this.state.error}
                            rerender={() => this.setState({ error: null, info: null })}
                            reload={this.handleReload}
                        />
                    )
            },
            'patchErrorBoundary',
        )

        logger.log('ErrorBoundary patched')
        resolveErrorBoundaryPatched()
    })
})

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
    name: 'ErrorBoundary'
    discordErrorsSet: boolean
    handleReload(): void
}

export type AppComponentModuleType = { default: FC }
export type AppGenericCallback = () => void
export type AppErroredCallback = (error: unknown) => void
