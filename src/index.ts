// So objectSeal and objectFreeze contain the proper functions before we overwrite them
import '@revenge-mod/utils/functions'

import { getErrorStack } from '@revenge-mod/utils/errors'
import { createLogger } from '@revenge-mod/utils/library'

import type { Metro } from '@revenge-mod/modules'

Object.freeze = Object.seal = o => o

async function onError(e: unknown) {
    const { ClientInfoModule } = await import('@revenge-mod/modules/native')

    logger.error(`Failed to load Revenge: ${getErrorStack(e)}`)
    alert(['Failed to load Revenge\n', `Build Number: ${ClientInfoModule.Build}`, getErrorStack(e)].join('\n'))
}

function onceIndexRequired() {
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

    const batchedBridge = __fbBatchedBridge
    const callQueue: any[] = []

    const origCFRFQ = batchedBridge.callFunctionReturnFlushedQueue
    batchedBridge.callFunctionReturnFlushedQueue = (...args) => {
        // Holding AppRegistry calls until we're ready (patches completed)
        // or if the module doesn't exist yet, we also hold it
        if (args[0] === 'AppRegistry' || !batchedBridge.getCallableModule(args[0])) {
            callQueue.push(args)
            return batchedBridge.flushedQueue()
        }

        return origCFRFQ.apply(batchedBridge, args)
    }

    initialize()
        .then(() => {
            batchedBridge.callFunctionReturnFlushedQueue = origCFRFQ
            for (const queue of callQueue) batchedBridge.__callFunction(...queue)
        })
        .catch(onError)
}

// ! This function is BLOCKING AppRegistry calls, so we need to make sure it's as fast as possible
async function initialize() {
    try {
        const { createModulesLibrary } = await import('@revenge-mod/modules')
        const ModulesLibraryPromise = createModulesLibrary()

        const [{ AppLibrary }, { AssetsLibrary }, UIColorsLibrary, { SettingsUILibrary }, { ReactJSXLibrary }] =
            await Promise.all([
                import('@revenge-mod/app'),
                import('@revenge-mod/assets'),
                import('@revenge-mod/ui/colors'),
                import('@revenge-mod/ui/settings'),
                import('@revenge-mod/react/jsx'),
            ])

        const ModulesLibrary = await ModulesLibraryPromise

        const [{ startPlugins, registerExternalPlugins }, { awaitStorage }, { settings, pluginsStates }] =
            await Promise.all([
                import('@revenge-mod/plugins'),
                import('@revenge-mod/storage'),
                import('@revenge-mod/preferences'),
            ])

        // TODO: Don't expose this global, instead pass to plugin contexts, for development, expose it via the developer-settings plugin
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
        await registerExternalPlugins()

        await awaitStorage(settings, pluginsStates)

        // TODO: Safe mode when plugins fail to load
        // Maybe put logic in ErrorBoundary
        await startPlugins()
    } catch (e) {
        onError(e)
    }
}

let require: Metro.RequireFn | undefined = globalThis.__r as typeof __r | undefined
// This rarely happens, but if __r is already set, that means we can initialize immediately
if (require) initialize()

let define: Metro.DefineFn | undefined

Object.defineProperties(globalThis, {
    __r: {
        configurable: true,
        get: () => require,
        set: metroRequire => {
            require = (id: number) =>
                id
                    ? // Early modules (React, React Native, polyfills, etc.) are required even before index (module 0) is required
                      metroRequire(id)
                    : // Once index is required, we initialize our patches
                      // biome-ignore lint/style/noCommaOperator: It is allowed now
                      (Object.defineProperty(globalThis, '__r', { value: metroRequire }), onceIndexRequired())
        },
    },
    __d: {
        configurable: true,
        get: () => {
            Object.defineProperty(globalThis, '__d', { value: define })
            globalThis.modules = __c!()
            return define
        },
        set: v => {
            define = v
        },
    },
})

const logger = createLogger('init')
