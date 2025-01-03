import { recordTimestamp } from '@revenge-mod/debug'
import { React, ReactNative } from '@revenge-mod/modules/common'
import { findByName } from '@revenge-mod/modules/finders'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'
import { createPatcherInstance } from '@revenge-mod/patcher'
import { ReactJSXLibrary } from '@revenge-mod/react/jsx'
import { createLogger } from '@revenge-mod/utils/library'

import type { Component, FC, ReactNode } from 'react'

const patcher = createPatcherInstance('revenge.library.app')
const logger = createLogger('app')

logger.log('Library loaded')

const initializeCallbacks = new Set<AppGenericCallback>()
const renderCallbacks = new Set<AppGenericCallback>()

export let isAppInitialized = false
export let isAppRendered = false

export function afterAppInitialize(callback: AppGenericCallback) {
    if (isAppInitialized) throw new Error('Cannot attach a callback after the app has already been initialized')
    initializeCallbacks.add(callback)
}

export function afterAppRender(callback: AppGenericCallback) {
    if (isAppRendered) throw new Error('Cannot attach a callback after the App component has been rendered')
    renderCallbacks.add(callback)
}

afterAppInitialize(() => (isAppInitialized = true))
afterAppRender(() => (isAppRendered = true))

const unpatchRunApplication = patcher.after(
    ReactNative.AppRegistry,
    'runApplication',
    () => {
        unpatchRunApplication()

        recordTimestamp('App_RunApplicationCalled')
        logger.log('AppRegistry.runApplication called')

        for (const callback of initializeCallbacks) callback()

        recordTimestamp('App_AfterRunRACallbacks')
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

        recordTimestamp('App_AfterRunCECallbacks')
        logger.log('Rendered callbacks called')
    },
    'runRenderCallbacks',
)

const afterErrorBoundaryPatchable = ReactNative.Platform.OS === 'ios' ? afterAppRender : afterAppInitialize

afterErrorBoundaryPatchable(async function patchErrorBoundary() {
    // Patching ErrorBoundary causes the weird "Element type is invalid" error due to TextInputWrapper's children being undefined
    // The reason for it being undefined is unknown, but it's not a problem on Android
    // Using this patch on Android also breaks how the chat input bar avoids the keyboard
    if (ReactNative.Platform.OS === 'ios')
        ReactJSXLibrary.afterElementCreate('PortalKeyboardPlaceholderInner', () => null)

    const { default: Screen } = await import('./components/ErrorBoundaryScreen')

    setImmediate(() => {
        patcher.after.await(
            findByName
                .async('ErrorBoundary')
                .then(it => (it as { name: string; prototype: ErrorBoundaryComponentPrototype }).prototype),
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
    afterRender: afterAppRender,
    /**
     * Attaches a callback to be called when the app has been initialized
     * @param callback The callback to be called
     */
    afterInitialize: afterAppInitialize,
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
