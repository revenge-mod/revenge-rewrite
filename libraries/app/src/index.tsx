import { recordTimestamp } from '@revenge-mod/debug'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'
import Libraries from '@revenge-mod/utils/library'

import React from 'react'

const initCbs = new Set<AppGenericCallback>()

let isInitialized = false

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

        afterInitialized(() => (isInitialized = true))

        // We can assume that after the first element is created, it is immediately being rendered
        // Patching <App /> or <AppContainer /> is very slow for some reason (probably because large amounts of data being passed around?)
        // Patching AppRegistry.runApplication is too slow, while AppRegistry.registerComponent never gets called (because slow awaiting the modules library)
        const unpatchBefore = patcher.before(React, 'createElement', () => {
            unpatchBefore()
            recordTimestamp('App_CreateElementCalled')
            // Prevent from blocking
            // TODO: setImmediate or setTimeout?
            setTimeout(() => {
                recordTimestamp('App_BeforeRunCallbacks')
                for (const callback of initCbs) callback()
                recordTimestamp('App_AfterRunCallbacks')
            })
        })

        // Libraries.instanceFor(ModulesLibrary).then(modules => {
        //     afterInitialized(function patchErrorBoundary() {
        //         // ! This patch takes a large amount of time (>0.5s)
        //         patcher.after.await(
        //             modules.findByName
        //                 .async('ErrorBoundary')
        //                 .then(it => it.prototype as ErrorBoundaryComponentPrototype),
        //             'render',
        //             function (this: ErrorBoundaryComponentPrototype) {
        //                 if (this.state.error ?? true) return null

        //                 // TODO: Proper UI for ErrorBoundary
        //                 return (
        //                     <ReactNative.Text>
        //                         {String(this.state.error.stack || String(this.state.error))}
        //                     </ReactNative.Text>
        //                 )
        //             },
        //             'patchErrorBoundary',
        //         )
        //     })
        // })

        return {
            /**
             * Whether the app has finished initializing
             */
            get initialized() {
                return isInitialized
            },
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

export type ErrorBoundaryComponentPrototype = (typeof React.Component)['prototype']
export type AppComponentModuleType = { default: React.FC }
export type AppGenericCallback = () => void
export type AppErroredCallback = (error: unknown) => void
