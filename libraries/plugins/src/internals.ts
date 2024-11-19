import { type Patcher, createPatcherInstance } from '@revenge-mod/patcher'
import { createStorage } from '@revenge-mod/storage'
import { objectSeal } from '@revenge-mod/utils/functions'
import { lazyValue } from '@revenge-mod/utils/lazy'
import type React from 'react'
import type { PluginContext, PluginDefinition, PluginStage, PluginStorage } from '.'
import { app } from './shared'
import { subscribeModule, type MetroModuleSubscriptionCallback } from '@revenge-mod/modules/metro'

export const PluginIdRegex = /^[a-z0-9-_\.]{1,128}$/

export const appInitCallbacks = new Set<() => Promise<unknown>>()

export const corePluginIds = new Set<string>()
export const highPriorityPluginIds = new Set<InternalPluginDefinition['id']>()
export const plugins = new Map<InternalPluginDefinition['id'], InternalPluginDefinition>()

export const WhitelistedPluginObjectKeys = [
    'description',
    'disable',
    'icon',
    'id',
    'name',
    'version',
    'stop',
    'author',
    'errors',
] as const satisfies ReadonlyArray<keyof InternalPluginDefinition>

export const PluginStatus = {
    Stopped: 1,
    Fetching: 2,
    Starting: 3,
    Started: 4,
}

/** @internal */
export function registerPlugin<Storage = PluginStorage, AppLaunchedReturn = void, AppInitializedReturn = void>(
    definition: PluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn> &
        Partial<InternalPluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn>>,
    core = false,
    predicate?: () => boolean,
) {
    const cleanups = new Set<() => unknown>()

    if (plugins.has(definition.id)) throw new Error(`Plugin "${definition.id}" already exists`)
    if (!PluginIdRegex.test(definition.id))
        throw new Error(`Cannot register plugin "${definition.id}", invalid ID format`)

    const internalPlugin = objectSeal({
        ...definition,
        // Enabled by default if it is a core plugin, otherwise its enabled state will be modified after core plugins have started
        enabled: predicate?.() ?? core,
        core,
        status: PluginStatus.Stopped,
        getSettingsComponent: definition.settings,
        patcher: createPatcherInstance(`revenge.plugins.plugin#${definition.id}`),
        errors: [],
        get stopped() {
            return this.status === PluginStatus.Stopped
        },
        disable() {
            if (this.core) throw new Error(`Cannot disable core plugin "${this.id}"`)
            if (!this.stopped) this.stop()
            this.enabled = false
        },
        enable() {
            this.enabled = true
            return !!this.beforeAppRender
        },
        async start() {
            if (!this.enabled) throw new Error(`Plugin "${this.id}" must be enabled before starting`)
            if (!this.stopped) throw new Error(`Plugin "${this.id}" is already started`)

            this.status = PluginStatus.Starting

            if (this.onMetroModuleLoad) subscribeModule.all(this.onMetroModuleLoad)

            const handleError = (e: unknown, stage: string) => {
                this.errors.push(e)
                this.stop()
                throw new Error(`Plugin "${this.id}" failed to start at "${stage}"`, { cause: e })
            }

            if (app.initialized && this.beforeAppRender)
                handleError(
                    new Error(`Plugin "${this.id}" requires running before app is initialized`),
                    'beforeAppRender',
                )

            try {
                instance.context.beforeAppRender = await this.beforeAppRender?.(instance)
            } catch (e) {
                handleError(e, 'onAppLaunched')
            }

            if (this.afterAppRender)
                appInitCallbacks.add(async () => {
                    try {
                        instance.context.afterAppRender = await this.afterAppRender!(instance)
                        this.status = PluginStatus.Started
                    } catch (e) {
                        handleError(e, 'onAppInitialized')
                    }
                })
            else this.status = PluginStatus.Started
        },
        stop() {
            if (this.stopped) return

            try {
                this.beforeStop?.(instance)
            } catch (e) {
                this.errors.push(new Error(`Plugin "${this.id}" failed to stop`, { cause: e }))
            } finally {
                for (const cleanup of cleanups) cleanup()
                if (!this.patcher.destroyed) this.patcher.destroy()
            }
        },
    } as InternalPluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn>)
    // ^^ as works, but satisfies doesn't, why???

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

    // TODO: Only init a few other things when plugin is starting (like storage, patcher, etc.)
    // biome-ignore lint/suspicious/noExplicitAny: Defaulting types to something else doesn't end very well
    const instance: PluginContext<PluginStage, any, any, any> = {
        context: {
            beforeAppRender: null,
            afterAppRender: null,
        },
        plugin: proxy,
        patcher: internalPlugin.patcher,
        storage: createStorage(`revenge/plugins/${definition.id}/storage.json`, {
            initial: definition.initializeStorage?.() ?? {},
        }),
        revenge: lazyValue(() => revenge),
        cleanup: (...funcs) => {
            for (const cleanup of funcs) cleanups.add(cleanup)
        },
    }

    if (internalPlugin.core) corePluginIds.add(internalPlugin.id)
    plugins.set(internalPlugin.id, internalPlugin)
    if (internalPlugin.beforeAppRender) highPriorityPluginIds.add(internalPlugin.id)

    return proxy
}

// biome-ignore lint/suspicious/noExplicitAny: Defaulting types to something else doesn't end very well
export type InternalPluginDefinition<Storage = any, AppLaunchedReturn = any, AppInitializedReturn = any> = Omit<
    PluginDefinition<PluginStorage, AppLaunchedReturn, AppInitializedReturn>,
    'settings'
> & {
    /**
     * Runs when a Metro module loads, useful for patching modules very early on.
     * @internal
     */
    onMetroModuleLoad?: MetroModuleSubscriptionCallback
    /**
     * Disables the plugin
     */
    disable(): void
    /** @internal */
    enable(): boolean
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
    getSettingsComponent?: React.FC<PluginContext<'AfterAppRender', Storage, AppLaunchedReturn, AppInitializedReturn>>
    /** @internal */
    core: boolean
    /** @internal */
    // biome-ignore lint/suspicious/noExplicitAny: Anything can be thrown
    errors: any[]
    patcher: Patcher
}
