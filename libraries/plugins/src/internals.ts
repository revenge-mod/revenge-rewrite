import { isAppRendered } from '@revenge-mod/app'

import type { Metro } from '@revenge-mod/modules'
import { subscribeModule } from '@revenge-mod/modules/metro'

import { type PluginStates, pluginsStates } from '@revenge-mod/preferences'

import { type Patcher, createPatcherInstance } from '@revenge-mod/patcher'
import { awaitStorage, createStorage } from '@revenge-mod/storage'
import { PluginStoragePath } from '@revenge-mod/shared/paths'

import { getErrorStack } from '@revenge-mod/utils/errors'
import { objectSeal } from '@revenge-mod/utils/functions'
import { lazyValue } from '@revenge-mod/utils/lazy'

import { PluginIdRegex, PluginStatus } from './constants'
import { logger } from './shared'

import type React from 'react'
import type {
    PluginContext,
    PluginDefinition,
    PluginManifest,
    PluginModuleSubscriptionContext,
    PluginStopConfig,
    PluginStorage,
} from '.'

export const appRenderedCallbacks = new Set<() => Promise<unknown>>()
export const corePluginIds = new Set<string>()
export const plugins: Record<
    InternalPluginDefinition<unknown, unknown, unknown>['id'],
    // biome-ignore lint/suspicious/noExplicitAny: I should really turn off this rule...
    PluginDefinition<any, any, any> & Omit<InternalPluginDefinition<any, any, any>, keyof PluginDefinition>
> = {}

const highPriorityPluginIds = new Set<InternalPluginDefinition<unknown, unknown, unknown>['id']>()

const DefaultStopConfig: Required<PluginStopConfig> = {
    reloadRequired: false,
}

export function registerPlugin<Storage = PluginStorage, AppLaunchedReturn = void, AppInitializedReturn = void>(
    definition: PluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn> &
        PluginManifest &
        Partial<
            Omit<InternalPluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn>, keyof PluginDefinition>
        >,
    core = false,
    manageable = !core,
    predicate?: () => boolean,
) {
    const cleanups = new Set<() => unknown>()

    if (definition.id in plugins) throw new Error(`Plugin "${definition.id}" already exists`)
    if (!PluginIdRegex.test(definition.id))
        throw new Error(`Cannot register plugin "${definition.id}", invalid ID format`)

    const prepareStorageAndPatcher = () => {
        instance.patcher ||= createPatcherInstance(`revenge.plugins.plugin#${definition.id}`)
        instance.storage ||= createStorage(PluginStoragePath(definition.id), {
            initial: definition.initializeStorage?.() ?? {},
        })
    }

    let status = PluginStatus.Stopped
    const startedStatus =
        definition.beforeAppRender || definition.afterAppRender ? PluginStatus.Started : PluginStatus.StartedEarly

    const internalPlugin = objectSeal({
        ...definition,
        state: lazyValue(
            () =>
                // Manageable?
                // - Yes: Check preferences, default to false if it doesn't exist
                // - No: Check predicate, default to if core
                (pluginsStates[definition.id] ??= {
                    enabled: manageable ? false : (predicate?.() ?? core),
                    errors: [],
                }),
        ),
        get enabled() {
            return this.state.enabled
        },
        set enabled(val: boolean) {
            if (!manageable) throw new Error(`Cannot enable/disable unmanageable plugin: ${this.id}`)
            this.state.enabled = val
        },
        get stopped() {
            // TODO: Maybe do something about this
            return this.status === PluginStatus.Stopped || this.status === PluginStatus.StartedEarly
        },
        core,
        manageable,
        get status() {
            return status
        },
        set status(val) {
            status = val
            if (val === startedStatus) this.state.errors = []
        },
        SettingsComponent: definition.settings,
        errors: [],
        disable() {
            if (!this.manageable) throw new Error(`Cannot disable unmanageable plugin: ${this.id}`)

            this.enabled = false
            if (!this.stopped) return this.stop()

            return DefaultStopConfig
        },
        enable() {
            this.enabled = true
            return !!(this.beforeAppRender || this.onMetroModuleLoad)
        },
        startMetroModuleSubscriptions() {
            if (!this.onMetroModuleLoad || !this.enabled) return

            prepareStorageAndPatcher()
            const unsub = subscribeModule.all((id, exports) => this.onMetroModuleLoad!(instance, id, exports, unsub))

            this.status = PluginStatus.StartedEarly
        },
        async start() {
            const handleError = (e: unknown) => {
                this.errors.push(e)
                this.stop()
            }

            if (!this.enabled) return handleError(new Error(`Plugin "${this.id}" must be enabled before starting`))
            if (!this.stopped) return handleError(new Error(`Plugin "${this.id}" is already started`))

            logger.log(`Starting plugin: ${this.id}`)
            this.status = PluginStatus.Starting

            if (isAppRendered && this.beforeAppRender)
                return handleError(new Error(`Plugin "${this.id}" requires running before app is initialized`))

            prepareStorageAndPatcher()

            try {
                instance.context.beforeAppRender = await this.beforeAppRender?.(instance)
            } catch (e) {
                return handleError(
                    new Error(`Plugin "${this.id}" encountered an error when running "beforeAppRender": ${e}`, {
                        cause: e,
                    }),
                )
            }

            if (this.afterAppRender) {
                const cb = async () => {
                    try {
                        await awaitStorage(instance.storage)
                        instance.context.afterAppRender = await this.afterAppRender!(instance)
                        this.status = PluginStatus.Started
                    } catch (e) {
                        return handleError(
                            new Error(`Plugin "${this.id}" encountered an error when running "afterAppRender": ${e}`, {
                                cause: e,
                            }),
                        )
                    }
                }

                if (isAppRendered) cb()
                else appRenderedCallbacks.add(cb)
            } else this.status = PluginStatus.Started
        },
        stop() {
            if (this.stopped) return DefaultStopConfig

            logger.log(`Stopping plugin: ${this.id}`)

            let data: Required<PluginStopConfig> | undefined

            try {
                const val = this.beforeStop?.(instance)
                data ??= val ? Object.assign(DefaultStopConfig, val) : DefaultStopConfig
            } catch (e) {
                this.errors.push(
                    new Error(`Plugin "${this.id}" encountered an error when stopping: ${e}`, { cause: e }),
                )
            }

            // Since plugins always get stopped when encountering an error, we can throw this
            if (this.errors.length) {
                this.state.errors.push(...this.errors)
                const msg = `Plugin "${this.id}" encountered ${this.errors.length} errors\n${this.errors.map(getErrorStack).join('\n')}`
                logger.error(msg)
                throw new AggregateError(this.errors, msg)
            }

            for (const cleanup of cleanups) cleanup()
            if (!instance.patcher.destroyed) instance.patcher.destroy()

            this.status = PluginStatus.Stopped

            return data ?? DefaultStopConfig
        },
    } satisfies PluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn> &
        Omit<InternalPluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn>, keyof PluginDefinition>)

    const proxy = new Proxy(internalPlugin, {
        get(target, prop) {
            // @ts-expect-error: No
            if (WhitelistedPluginObjectKeys.includes(prop)) return target[prop as keyof InternalPluginDefinition]
            return undefined
        },
        has(target, p) {
            // @ts-expect-error: Nah
            return WhitelistedPluginObjectKeys.includes(p) && p in target
        },
        defineProperty() {
            throw new Error('Cannot define plugin instance properties')
        },
        ownKeys(target) {
            // @ts-expect-error: Nein
            return Object.keys(target).filter(key => WhitelistedPluginObjectKeys.includes(key))
        },
        set() {
            throw new Error('Cannot set plugin instance properties')
        },
    })

    // biome-ignore lint/suspicious/noExplicitAny: Defaulting types to something else doesn't end very well
    const instance: PluginContext<any, any, any, any> = {
        context: {
            beforeAppRender: null,
            afterAppRender: null,
        },
        plugin: proxy,
        patcher: null as unknown as Patcher,
        storage: null,
        revenge: lazyValue(() => revenge),
        cleanup: (...funcs) => {
            for (const cleanup of funcs) cleanups.add(cleanup)
        },
    }

    if (internalPlugin.core) corePluginIds.add(internalPlugin.id)
    plugins[internalPlugin.id] = internalPlugin
    if (internalPlugin.beforeAppRender) highPriorityPluginIds.add(internalPlugin.id)

    return proxy as PluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn>
}

export type InternalPluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn> = Omit<
    PluginDefinition<PluginStorage, AppLaunchedReturn, AppInitializedReturn>,
    'settings'
> &
    PluginManifest & {
        state: PluginStates[PluginManifest['id']]
        /**
         * Runs when a Metro module loads, useful for patching modules very early on.
         * @internal
         */
        onMetroModuleLoad?: (
            context: PluginModuleSubscriptionContext<Storage>,
            id: Metro.ModuleID,
            exports: Metro.ModuleExports,
            unsubscribe: () => void,
        ) => void
        /**
         * Disables the plugin
         * @returns A full plugin stop config object
         * @see {@link PluginStopConfig}
         */
        disable(): Required<PluginStopConfig>
        /**
         * Enables the plugin
         * @internal
         * @returns Whether a reload should be required
         */
        enable(): boolean
        /**
         * Starts the plugin's Metro module subscriptions (if it exists)
         * @internal
         */
        startMetroModuleSubscriptions: () => void
        /**
         * Starts the plugin normal lifecycles
         * @internal
         */
        start(): Promise<void>
        /**
         * Stops the plugin
         * @internal
         * @returns A full plugin stop config object
         */
        stop(): Required<PluginStopConfig>
        /**
         * Whether the plugin is stopped
         * @internal
         */
        stopped: boolean
        /**
         * Whether the plugin is enabled. This will be set to `false` in the `beforeStop` lifecycle if the user disables the plugin.
         */
        enabled: boolean
        /**
         * The plugin's status
         * @internal
         */
        status: (typeof PluginStatus)[keyof typeof PluginStatus]
        /**
         * The plugin's settings component
         * @internal
         **/
        SettingsComponent?: React.FC<PluginContext<'AfterAppRender', Storage, AppLaunchedReturn, AppInitializedReturn>>
        /**
         * Whether the plugin is a core plugin
         * @internal
         */
        core: boolean
        /**
         * Whether the plugin is manageable (can be disabled/enabled)
         * @internal
         */
        manageable: boolean
        /**
         * The plugin's errors
         * @internal
         **/
        // biome-ignore lint/suspicious/noExplicitAny: Anything can be thrown
        errors: any[]
    }
