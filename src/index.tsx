// So objectSeal and objectFreeze contain the proper functions before we overwrite them
import '@revenge-mod/utils/functions'
import { recordTimestamp } from '@revenge-mod/debug'

import { AppLibrary } from '@revenge-mod/app'
import { AssetsLibrary } from '@revenge-mod/assets'
import { type Metro, ModulesLibrary } from '@revenge-mod/modules'
import { IndexMetroModuleId } from '@revenge-mod/modules/constants'
import { ClientInfoModule } from '@revenge-mod/modules/native'
import { PluginsLibrary } from '@revenge-mod/plugins'
import { internalSymbol } from '@revenge-mod/shared/symbols'
import { awaitStorage } from '@revenge-mod/storage'
import { SettingsUILibrary } from '@revenge-mod/ui/settings'
import { getErrorStack } from '@revenge-mod/utils/errors'
import Libraries from '@revenge-mod/utils/library'

// ! This function is BLOCKING, so we need to make sure it's as fast as possible
function initialize() {
    recordTimestamp('Init_Initialize')
    Object.freeze = Object.seal = o => o

    try {
        const promise = ModulesLibrary.new().then(modules => {
            const promise = import('@revenge-mod/preferences')
            // Initialize storages

            // Initializing this early (before modules module) can sometimes cause the app to be in a limbo state
            // Don't know how, and why
            const app = AppLibrary.new()
            const plugins = PluginsLibrary.new()

            globalThis.revenge = {
                app,
                assets,
                modules,
                plugins,
                ui,
            }

            promise.then(async ({ settings }) => {
                await awaitStorage(settings)
                recordTimestamp('Storage_Initialized')
                import('./plugins').then(() => {
                    recordTimestamp('Plugins_CoreImported')
                    revenge.plugins[internalSymbol].startCorePlugins()
                    recordTimestamp('Plugins_CoreStarted')
                })
            })
        })

        // Initialize libraries that don't need the whole instance of @revenge-mod/modules
        const assets = AssetsLibrary.new()
        const ui = {
            settings: SettingsUILibrary.new(),
        }

        return promise
    } catch (e) {
        onError(e)
    }
}

function onError(e: unknown) {
    Libraries.destroyAll()

    console.error(`Failed to load Revenge: ${getErrorStack(e)}`)

    if (ReactNative && !ReactNative.AppRegistry.getAppKeys().includes('Discord')) {
        const styles = ReactNative.StyleSheet.create({
            view: {
                flex: 1,
                backgroundColor: '#000b',
                padding: 16,
            },
            head: {
                fontSize: 24,
                fontWeight: 'bold',
                color: 'white',
            },
            desc: {
                fontSize: 16,
                color: 'white',
            },
            stack: {
                fontSize: 16,
                fontFamily: 'monospace',
                color: 'white',
            },
        })

        ReactNative.AppRegistry.registerComponent('Discord', () => () => (
            <ReactNative.View style={styles.view}>
                <ReactNative.Text style={styles.head}>Failed to load Revenge, and Discord!</ReactNative.Text>
                <ReactNative.Text style={[styles.desc, { marginBottom: 16 }]}>
                    The app is unable to start at this stage, as the index module (module 0) could not be imported in
                    time. This will result in a native crash if not caught by Revenge!
                </ReactNative.Text>
                <ReactNative.Text style={styles.desc}>Stack trace (scrollable):</ReactNative.Text>
                <ReactNative.ScrollView style={{ flex: 1 }}>
                    <ReactNative.Text style={styles.stack}>{getErrorStack(e)}</ReactNative.Text>
                </ReactNative.ScrollView>
            </ReactNative.View>
        ))
    } else alert(['Failed to load Revenge\n', `Build Number: ${ClientInfoModule.Build}`, getErrorStack(e)].join('\n'))
}

Libraries.create(
    {
        name: 'init',
        uses: ['patcher'],
    },
    ({ patcher, cleanup }) => {
        cleanup(() => {
            // @ts-expect-error
            // biome-ignore lint/performance/noDelete: Only a one-time thing
            if ('revenge' in globalThis) delete globalThis.revenge
        })

        if (typeof __r !== 'undefined') return initialize()

        // We hold calls from the native side
        function onceIndexRequired() {
            recordTimestamp('Native_RequiredIndex')

            const batchedBridge = __fbBatchedBridge

            // TODO: Check if this is needed
            // patcher.before(batchedBridge, 'callFunctionReturnFlushedQueue', noop)

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
                ?.then(() => {
                    recordTimestamp('Init_PromiseResolved')
                    unpatch()
                    for (const queue of callQueue)
                        batchedBridge.getCallableModule(queue[0]) && batchedBridge.__callFunction(...queue)
                })
                ?.catch(onError)
        }

        let requireFunc: Metro.RequireFn | undefined
        let initialized = false

        Object.defineProperties(globalThis, {
            __r: {
                configurable: true,
                get: () => requireFunc,
                set(metroRequire) {
                    requireFunc = function patchedRequire(id: number) {
                        if (id === IndexMetroModuleId) {
                            // Preventing initializing too many times (in my testing, index was called like 10 times)
                            if (initialized) return
                            initialized = true
                            onceIndexRequired()
                            requireFunc = metroRequire
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
    },
).new()
