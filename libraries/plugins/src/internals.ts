import { isAppRendered } from '@revenge-mod/app'
import type { Metro } from '@revenge-mod/modules'
import { subscribeModule } from '@revenge-mod/modules/metro'
import { type Patcher, createPatcherInstance } from '@revenge-mod/patcher'
import { awaitStorage, createStorage } from '@revenge-mod/storage'
import { getErrorStack } from '@revenge-mod/utils/errors'
import { objectSeal } from '@revenge-mod/utils/functions'
import { lazyValue } from '@revenge-mod/utils/lazy'
import type React from 'react'
import type { PluginContext, PluginDefinition, PluginModuleSubscriptionContext, PluginStorage } from '.'
import { PluginIdRegex, PluginStatus } from './constants'
import { logger } from './shared'

export const appRenderedCallbacks = new Set<() => Promise<unknown>>()
export const corePluginIds = new Set<string>()
export const plugins = new Map<
    InternalPluginDefinition<unknown, unknown, unknown>['id'],
    // biome-ignore lint/suspicious/noExplicitAny: I should really turn off this rule...
    PluginDefinition<any, any, any> & Omit<InternalPluginDefinition<any, any, any>, keyof PluginDefinition>
>()

const highPriorityPluginIds = new Set<InternalPluginDefinition<unknown, unknown, unknown>['id']>()

export function registerPlugin<Storage = PluginStorage, AppLaunchedReturn = void, AppInitializedReturn = void>(
    definition: PluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn> &
        Partial<
            Omit<InternalPluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn>, keyof PluginDefinition>
        >,
    core = false,
    managable = !core,
    predicate?: () => boolean,
) {
    const cleanups = new Set<() => unknown>()

    if (plugins.has(definition.id)) throw new Error(`Plugin "${definition.id}" already exists`)
    if (!PluginIdRegex.test(definition.id))
        throw new Error(`Cannot register plugin "${definition.id}", invalid ID format`)

    const prepareStorageAndPatcher = () => {
        instance.patcher ||= createPatcherInstance(`revenge.plugins.plugin#${definition.id}`)
        instance.storage ||= createStorage(`revenge/plugins/${definition.id}/storage.json`, {
            initial: definition.initializeStorage?.() ?? {},
        })
    }

    const internalPlugin = objectSeal({
        ...definition,
        // Enabled by default if it is a core plugin, otherwise its enabled state will be modified after core plugins have started
        enabled: predicate?.() ?? core,
        core,
        managable,
        status: PluginStatus.Stopped,
        SettingsComponent: definition.settings,
        errors: [],
        get stopped() {
            return this.status === PluginStatus.Stopped
        },
        disable() {
            if (!this.managable) throw new Error(`Cannot disable unmanagable plugin "${this.id}"`)
            if (!this.stopped) this.stop()
            this.enabled = false
        },
        enable() {
            this.enabled = true
            return !!this.beforeAppRender
        },
        startMetroModuleSubscriptions() {
            if (this.onMetroModuleLoad) {
                prepareStorageAndPatcher()
                const unsub = subscribeModule.all((id, exports) =>
                    this.onMetroModuleLoad!(instance, id, exports, unsub),
                )
            }
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
            if (this.stopped) return

            logger.log(`Stopping plugin: ${this.id}`)

            try {
                this.beforeStop?.(instance)
            } catch (e) {
                this.errors.push(
                    new Error(`Plugin "${this.id}" encountered an error when stopping: ${e}`, { cause: e }),
                )
            }

            for (const cleanup of cleanups) cleanup()
            if (!instance.patcher.destroyed) instance.patcher.destroy()

            this.status = PluginStatus.Stopped

            // Since plugins always get stopped when encountering an error, we can throw this
            if (this.errors.length) {
                const msg = `Plugin "${this.id}" encountered ${this.errors.length} errors\n${this.errors.map(getErrorStack).join('\n')}`
                logger.error(msg)
                throw new AggregateError(this.errors, msg)
            }
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
    plugins.set(internalPlugin.id, internalPlugin)
    if (internalPlugin.beforeAppRender) highPriorityPluginIds.add(internalPlugin.id)

    return proxy as PluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn>
}

export type InternalPluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn> = Omit<
    PluginDefinition<PluginStorage, AppLaunchedReturn, AppInitializedReturn>,
    'settings'
> & {
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
     */
    disable(): void
    /** @internal */
    enable(): boolean
    /** @internal */
    startMetroModuleSubscriptions: () => void
    /** @internal */
    start(): Promise<void>
    /** @internal */
    stop(): unknown
    /** @internal */
    stopped: boolean
    /**
     * Whether the plugin is enabled
     */
    enabled: boolean
    /** @internal */
    status: (typeof PluginStatus)[keyof typeof PluginStatus]
    /** @internal */
    SettingsComponent?: React.FC<PluginContext<'AfterAppRender', Storage, AppLaunchedReturn, AppInitializedReturn>>
    /** @internal */
    core: boolean
    /** @internal */
    managable: boolean
    /** @internal */
    // biome-ignore lint/suspicious/noExplicitAny: Anything can be thrown
    errors: any[]
}
