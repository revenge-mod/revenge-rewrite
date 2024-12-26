// So objectSeal and objectFreeze contain the proper functions before we overwrite them
import '@revenge-mod/utils/functions'

import { createLogger } from '@revenge-mod/utils/library'

import { recordTimestamp } from '@revenge-mod/debug'
import { IndexMetroModuleId } from '@revenge-mod/modules/constants'
import { ClientInfoModule } from '@revenge-mod/modules/native'
import { getErrorStack } from '@revenge-mod/utils/errors'

import type { Metro } from '@revenge-mod/modules'
import { createPatcherInstance } from '@revenge-mod/patcher'

Object.freeze = Object.seal = o => o

// ! This function is BLOCKING, so we need to make sure it's as fast as possible
async function initialize() {
    recordTimestamp('Init_Initialize')

    try {
        const [{ createModulesLibrary }, { SettingsUILibrary }] = await Promise.all([
            import('@revenge-mod/modules'),
            import('@revenge-mod/ui/settings'),
        ])

        const ModulesLibraryPromise = createModulesLibrary()

        const [{ AppLibrary }, { AssetsLibrary }, UIColorsLibrary, { ReactJSXLibrary }] = await Promise.all([
            import('@revenge-mod/app'),
            import('@revenge-mod/assets'),
            import('@revenge-mod/ui/colors'),
            import('@revenge-mod/react/jsx'),
        ])

        const ModulesLibrary = await ModulesLibraryPromise

        const [
            { startCorePlugins, startPluginsMetroModuleSubscriptions: startCorePluginsMetroModuleSubscriptions },
            { awaitStorage },
            { settings, pluginsStates },
        ] = await Promise.all([
            import('@revenge-mod/plugins'),
            import('@revenge-mod/storage'),
            import('@revenge-mod/preferences'),
        ])

        globalThis.revenge = {
            app: AppLibrary,
            assets: AssetsLibrary,
            modules: ModulesLibrary,
            react: {
                jsx: ReactJSXLibrary,
            },
            ui: {
                settings: SettingsUILibrary,
                colors: UIColorsLibrary,
            },
        }

        await import('./plugins')
        recordTimestamp('Plugins_CoreImported')

        await awaitStorage(settings, pluginsStates)
        recordTimestamp('Storage_Initialized')

        startCorePluginsMetroModuleSubscriptions()

        await startCorePlugins()
        recordTimestamp('Plugins_CoreStarted')

        // TODO
        // try {
        //     startExternalPlugins()
        // } catch (e) {
        //     settings.safeMode.enabledNextLaunch = true
        //     throw e
        // }
    } catch (e) {
        onError(e)
    }
}

function onError(e: unknown) {
    logger.error(`Failed to load Revenge: ${getErrorStack(e)}`)
    alert(['Failed to load Revenge\n', `Build Number: ${ClientInfoModule.Build}`, getErrorStack(e)].join('\n'))
}

let requireFunc: Metro.RequireFn | undefined

const patcher = createPatcherInstance('revenge.library.init')
const logger = createLogger('init')

// Hermes doesn't natively support Promises, it instead has a polyfill for it which doesn't handle rejections very well
// It doesn't throw and never logs in a non-development environment, we are patching it to do so, so we can catch errors when using async functions
// https://github.com/facebook/hermes/blob/3332fa020cae0bab751f648db7c94e1d687eeec7/lib/InternalBytecode/01-Promise.js#L446
const ErrorTypeWhitelist = [ReferenceError, TypeError, RangeError]
Promise._m = (promise, err) => {
    // If the rejections are useful enough, we log them
    if (err)
        setTimeout(
            () => {
                if (promise._h === 0) logger.error(`Unhandled promise rejection: ${getErrorStack(err)}`)
            },
            ErrorTypeWhitelist.some(it => err instanceof it) ? 0 : 2000,
            // The time is completely arbitary. I've picked what Hermes chose.
        )
}

if (typeof __r !== 'undefined') initialize()

// We hold calls from the native side
function onceIndexRequired() {
    recordTimestamp('Native_RequiredIndex')

    const batchedBridge = __fbBatchedBridge

    // biome-ignore lint/suspicious/noExplicitAny: Too lazy to type this
    const callQueue: any[] = []
    const unpatch = patcher.instead(
        batchedBridge,
        'callFunctionReturnFlushedQueue',
        (args, orig) => {
            if (args[0] === 'AppRegistry' || !batchedBridge.getCallableModule(args[0])) {
                callQueue.push(args)
                return batchedBridge.flushedQueue()
            }

            return orig.apply(batchedBridge, args)
        },
        'holdNativeCalls',
    )

    initialize()
        .then(() => {
            recordTimestamp('Init_PromiseResolved')
            unpatch()
            for (const queue of callQueue)
                batchedBridge.getCallableModule(queue[0]) && batchedBridge.__callFunction(...queue)
        })
        .catch(onError)
}

Object.defineProperties(globalThis, {
    __r: {
        configurable: true,
        get: () => requireFunc,
        set(metroRequire) {
            requireFunc = function patchedRequire(id: number) {
                if (id === IndexMetroModuleId) {
                    requireFunc = metroRequire
                    onceIndexRequired()
                } else return metroRequire(id)
            }
        },
    },
    __d: {
        configurable: true,
        get() {
            globalThis.modules ??= __c?.()
            return this.value
        },
        set(v) {
            this.value = v
        },
    },
})
