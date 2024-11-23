import { recordTimestamp } from '@revenge-mod/debug'
import { ModulesLibrary } from '@revenge-mod/modules'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'
import Libraries from '@revenge-mod/utils/library'

import type { Component, FC, ReactNode } from 'react'

const initCbs = new Set<AppGenericCallback>()
const rndrCbs = new Set<AppGenericCallback>()

let isInitialized = false
let isAppContainerRendered = false

export const AppLibrary = Libraries.create(
    {
        name: 'app',
        uses: ['patcher'],
    },
    ({ patcher }) => {
        const afterInitialized = (callback: AppGenericCallback) => {
            if (isInitialized) throw new Error('Cannot attach a callback after the app has already been initialized')
            initCbs.add(callback)
        }

        const afterRendered = (callback: AppGenericCallback) => {
            if (isAppContainerRendered)
                throw new Error('Cannot attach a callback after the App component has been rendered')
            rndrCbs.add(callback)
        }

        afterInitialized(() => (isInitialized = true))
        afterRendered(() => (isAppContainerRendered = true))

        const unpatchRunApplication = patcher.after(ReactNative.AppRegistry, 'runApplication', () => {
            unpatchRunApplication()
            recordTimestamp('App_RunApplicationCalled')
            for (const callback of initCbs) callback()
            recordTimestamp('App_AfterRunCallbacks')
        })

        const unpatchCreateElement = patcher.after(React, 'createElement', () => {
            unpatchCreateElement()
            recordTimestamp('App_CreateElementCalled')
            for (const callback of rndrCbs) callback()
        })

        const unpatchRegisterComponent = patcher.before(ReactNative.AppRegistry, 'registerComponent', () => {
            unpatchRegisterComponent()

            setImmediate(async () => {
                const { default: Screen } = await import('./components/ErrorBoundaryScreen')
                const modules = await Libraries.instanceFor(ModulesLibrary)

                patcher.after.await(
                    modules.findByName
                        .async('ErrorBoundary')
                        .then(it => it.prototype as ErrorBoundaryComponentPrototype),
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
        })

        return {
            /**
             * Whether the app has finished initializing
             */
            get initialized() {
                return isInitialized
            },
            /**
             * Whether the App component has been rendered
             */
            get rendered() {
                return isAppContainerRendered
            },
            /**
             * Attaches a callback to be called when the app has been rendered
             * @param callback The callback to be called
             */
            afterRendered,
            /**
             * Attaches a callback to be called when the app has been initialized
             * @param callback The callback to be called
             */
            afterInitialized,
            /**
             * Reloads the app
             */
            reload: () => BundleUpdaterManager.reload(),
        }
    },
)

export const { patcher } = Libraries.contextFor(AppLibrary)

export type AppLibrary = ReturnType<(typeof AppLibrary)['new']>

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
