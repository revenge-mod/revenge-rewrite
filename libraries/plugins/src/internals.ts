import { afterAppRender, isAppRendered } from '@revenge-mod/app'
import { subscribeModule } from '@revenge-mod/modules/metro'
import { createPatcherInstance } from '@revenge-mod/patcher'
import { DefaultPluginStopConfig, PluginStatus, WhitelistedPluginObjectKeys } from '@revenge-mod/plugins/constants'
import { type PluginStates, pluginsStates } from '@revenge-mod/preferences'
import { ExternalPluginsMetadataFilePath, PluginStoragePath } from '@revenge-mod/shared/paths'
import { awaitStorage, createStorage } from '@revenge-mod/storage'

import { getErrorStack } from '@revenge-mod/utils/errors'
import { objectFreeze, objectSeal } from '@revenge-mod/utils/functions'
import { lazyValue } from '@revenge-mod/utils/lazy'
import { logger } from './shared'

import { type FC, createElement } from 'react'

import type { PluginManifest, PluginDefinition } from './schemas'
import type { PluginContext, PluginStopConfig, PluginStorage } from './types'

export const registeredPlugins: Record<PluginManifest['id'], InternalPluginDefinition> = {}
export const externalPluginsMetadata = createStorage<Record<PluginManifest['id'], ExternalPluginMetadata>>(
    ExternalPluginsMetadataFilePath,
)

export type ExternalPluginMetadata =
    | {
          local: true
          source?: undefined
      }
    | {
          local: false
          source: string
      }

interface RegisterPluginOptions {
    external?: boolean
    manageable?: boolean
    enabled?: boolean
}

export function registerPlugin<
    Storage extends PluginStorage = PluginStorage,
    AppLaunchedReturn = void,
    AppInitializedReturn = void,
>(
    manifest: PluginManifest,
    definition: PluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn>,
    opts: RegisterPluginOptions = {},
) {
    if (manifest.id in registeredPlugins) throw new Error(`Plugin "${manifest.id}" is already registered`)

    const external = opts.external ?? true
    const options: Required<RegisterPluginOptions> = {
        external,
        manageable: opts.manageable ?? external,
        // Internal plugins are enabled by default
        // While external plugins are disabled by default
        enabled: opts.enabled ?? !external,
    }

    let status: PluginStatus = PluginStatus.Stopped
    const cleanups = new Set<() => unknown>()

    const def: InternalPluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn> = {
        ...manifest,
        context: lazyValue(() => ctx, { hint: 'object' }),
        external: options.external,
        manageable: options.manageable,
        lifecycles: {
            prepare() {
                ctx.patcher ||= createPatcherInstance(`revenge.plugins.plugin(${manifest.id})`)
                ctx.storage ||= createStorage<Storage>(PluginStoragePath(manifest.id), {
                    initial: definition.initializeStorage?.() ?? ({} as Storage),
                })
            },
            subscribeModules: definition.onMetroModuleLoad
                ? () => {
                      def.lifecycles.prepare()

                      const unsub = subscribeModule.all((id, exports) =>
                          definition.onMetroModuleLoad!(ctx, id, exports, unsub),
                      )

                      def.status = PluginStatus.Started
                  }
                : undefined,
            beforeAppRender: definition.beforeAppRender,
            afterAppRender: definition.afterAppRender,
            beforeStop: definition.beforeStop,
        },
        state: lazyValue(
            () =>
                (pluginsStates[manifest.id] ??= {
                    enabled: options.enabled,
                    errors: [],
                }),
            { hint: 'object' },
        ),
        get status() {
            return status
        },
        set status(val: PluginStatus) {
            status = val
            if (!this.stopped) this.state.errors = []
        },
        get enabled() {
            return this.state.enabled
        },
        set enabled(value: boolean) {
            if (!this.manageable) return
            this.state.enabled = value
        },
        get stopped() {
            return this.status === PluginStatus.Stopped
        },
        SettingsComponent: definition.SettingsComponent
            ? () => createElement(definition.SettingsComponent!, ctx!)
            : undefined,
        disable() {
            if (!this.manageable) throw new Error(`Cannot disable unmanageable plugin: ${this.id}`)

            this.enabled = false
            if (!this.stopped) return this.stop()

            return DefaultPluginStopConfig
        },
        enable() {
            if (!this.manageable) throw new Error(`Cannot enable unmanageable plugin: ${this.id}`)
            this.enabled = true
        },
        errors: [],
        async start() {
            const handleError = (e: unknown) => {
                this.errors.push(e)
                // Disabling stops the plugin
                this.disable()
            }

            if (!this.enabled) return handleError(new Error(`Plugin "${this.id}" must be enabled before starting`))
            if (!this.stopped) return handleError(new Error(`Plugin "${this.id}" is already started`))

            logger.log(`Starting plugin: ${this.id}`)
            this.status = PluginStatus.Starting

            if (isAppRendered && this.lifecycles.beforeAppRender)
                return handleError(new Error(`Plugin "${this.id}" requires running before app is initialized`))

            this.lifecycles.prepare()
            this.lifecycles.subscribeModules?.()

            if (this.lifecycles.beforeAppRender) {
                try {
                    ctx.context.beforeAppRender = ((await this.lifecycles.beforeAppRender(ctx)) ??
                        null) as Awaited<AppLaunchedReturn> | null
                } catch (e) {
                    return handleError(
                        new Error(
                            `Plugin "${this.id}" encountered an error when running lifecycle "beforeAppRender": ${e}`,
                            {
                                cause: e,
                            },
                        ),
                    )
                }
            }

            if (!this.lifecycles.afterAppRender) return void (this.status = PluginStatus.Started)

            const callback = async () => {
                try {
                    await awaitStorage(ctx.storage)
                    ctx.context.afterAppRender = ((await this.lifecycles.afterAppRender!(ctx)) ??
                        null) as Awaited<AppInitializedReturn> | null
                    this.status = PluginStatus.Started
                } catch (e) {
                    return handleError(
                        new Error(
                            `Plugin "${this.id}" encountered an error when running lifecycle "afterAppRender": ${e}`,
                            {
                                cause: e,
                            },
                        ),
                    )
                }
            }

            if (isAppRendered) callback()
            else afterAppRender(callback)
        },
        stop() {
            if (this.stopped) return DefaultPluginStopConfig

            logger.log(`Stopping plugin: ${this.id}`)

            let stopConfig: Required<PluginStopConfig> = DefaultPluginStopConfig

            try {
                const val = this.lifecycles.beforeStop?.(ctx)
                stopConfig = Object.assign(DefaultPluginStopConfig, val)
            } catch (e) {
                this.errors.push(
                    new Error(`Plugin "${this.id}" encountered an error when running lifecycle "beforeStop": ${e}`, {
                        cause: e,
                    }),
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
            if (!ctx.patcher.destroyed) ctx.patcher.destroy()

            this.status = PluginStatus.Stopped

            return stopConfig
        },
    }

    objectFreeze(def)
    objectSeal(def)

    const ctx: PluginContext<any, Storage, AppLaunchedReturn, AppInitializedReturn> = {
        patcher: null!,
        storage: null!,
        context: {
            beforeAppRender: null,
            afterAppRender: null,
        },
        revenge: lazyValue(() => revenge, { hint: 'object' }),
        cleanup(...funcs) {
            for (const cleanup of funcs) cleanups.add(cleanup)
        },
        plugin: makePluginDefinitionProxy(def),
    }

    registeredPlugins[manifest.id] = def

    return def
}

export function unregisterPlugin(id: string, opts: { persistState?: boolean } = {}) {
    const plugin = registeredPlugins[id]
    if (!plugin) throw new Error(`Plugin "${id}" is not registered`)

    plugin.disable()
    delete registeredPlugins[id]
    if (!opts.persistState) delete pluginsStates[id]
}

function makePluginDefinitionProxy<T extends InternalPluginDefinition>(def: T): T {
    return new Proxy(def, {
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
            throw new Error('Cannot define internal plugin definition properties')
        },
        ownKeys(target) {
            // @ts-expect-error: Nein
            return Object.keys(target).filter(key => WhitelistedPluginObjectKeys.includes(key))
        },
        set() {
            throw new Error('Cannot set internal plugin definition properties')
        },
    })
}

export type InternalPluginDefinition<
    Storage = any,
    AppLaunchedReturn = any,
    AppInitializedReturn = any,
> = PluginManifest & {
    context: PluginContext<any, Storage, AppLaunchedReturn, AppInitializedReturn>
    state: PluginStates[PluginManifest['id']]
    lifecycles: Pick<
        PluginDefinition<Storage, AppLaunchedReturn, AppInitializedReturn>,
        'beforeAppRender' | 'afterAppRender' | 'beforeStop'
    > & {
        prepare(): void
        subscribeModules?: () => void
    }
    /**
     * Disables the plugin
     * @returns A full plugin stop config object
     * @see {@link PluginStopConfig}
     */
    disable(): Required<PluginStopConfig>
    /**
     * Enables the plugin
     * @internal
     */
    enable(): void
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
    SettingsComponent?: FC<PluginContext<'AfterAppRender', Storage, AppLaunchedReturn, AppInitializedReturn>>
    /**
     * Whether the plugin is an external plugin
     * @internal
     */
    external: boolean
    /**
     * Whether the plugin is manageable (can be disabled/enabled)
     * @internal
     */
    manageable: boolean
    /**
     * The plugin's errors
     * @internal
     **/
    errors: any[]
}
