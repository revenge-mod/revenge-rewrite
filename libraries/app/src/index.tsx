import { React, ReactNative } from '@revenge-mod/modules/common'
import { byName } from '@revenge-mod/modules/filters'
import { findAsync } from '@revenge-mod/modules/finders'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'
import { createPatcherInstance } from '@revenge-mod/patcher'
import { createLogger } from '@revenge-mod/utils/library'

import type { Component, FC, ReactNode } from 'react'

const patcher = createPatcherInstance('revenge.library.app')
const logger = createLogger('app')

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

        for (const callback of initializeCallbacks) callback()
        logger.log('Initialized callbacks called')
    },
    'runInitializeCallbacks',
)

const unpatchCreateElement = patcher.after(
    React,
    'createElement',
    () => {
        unpatchCreateElement()

        for (const callback of renderCallbacks) callback()
        logger.log('Rendered callbacks called')
    },
    'runRenderCallbacks',
)

afterAppInitialize(async () => {
    const { default: Screen } = await import('./components/ErrorBoundaryScreen')
    const ErrorBoundary = (await findAsync(byName<{ prototype: ErrorBoundaryComponentPrototype }>('ErrorBoundary')))!

    const origRender = ErrorBoundary.prototype.render
    ErrorBoundary.prototype.render = function() {
        if (this.state.error)
            return (
                <Screen
                    error={this.state.error}
                    rerender={() => this.setState({ error: null, info: null })}
                    reload={this.handleReload}
                />
            )

        return origRender.call(this)
    }

    logger.log('ErrorBoundary patched')
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
    discordErrorsSet: boolean
    handleReload(): void
}

export type AppComponentModuleType = { default: FC }
export type AppGenericCallback = () => void
export type AppErroredCallback = (error: unknown) => void
