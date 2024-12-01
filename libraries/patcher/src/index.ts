import * as patcherImpl from '@marshift/strawberry'
import type { AnyObject } from '@revenge-mod/shared/types'
import type { AwaitedWrappableParams, UnpatchFunction, WrappableName } from './types'
import { createExtendedPatchFunction, trapFunctionCallsRecursive } from './utils'

/**
 * Used to mark a module as lazy for patcher, the patcher will wait for the module to be loaded before applying the patch
 * @internal
 */
export const patcherLazyModuleSymbol = Symbol.for('revenge.patcher.lazyModule')

const patcherInstances = new Map<string, Set<UnpatchFunction>>()

const _after = createExtendedPatchFunction<'after'>(patcherImpl.after)
const _before = createExtendedPatchFunction<'before'>(patcherImpl.before)
const _instead = createExtendedPatchFunction<'instead'>(patcherImpl.instead)

/**
 * Creates a new patcher instance, which are tied to specific patches
 * @param name The name of this patcher instance
 * @returns A patcher instance
 */
export function createPatcherInstance(name: string) {
    if (patcherInstances.has(name)) throw new Error(`Patcher instance with the name "${name}" already exists`)

    const unpatches = new Set<UnpatchFunction>()
    const cleanups = new WeakMap<UnpatchFunction, Set<PatchCleanupFunction>>()

    patcherInstances.set(name, unpatches)

    const onBeforeCall = (_args: unknown[]) => {
        const args = _args as AwaitedWrappableParams<WrappableName, Promise<AnyObject>, string>
        const debugKey = args[3] ?? '[NO_DEBUG_KEY]'
        const callback = args[2]

        // Patch the callback, so we can at least log a few things in case something fails
        args[2] = function patchedCallback(patchArgs, origOrRval) {
            if (__REVENGE_DEV__) console.debug(`Patch ${name}:${debugKey} is intercepting`)
            try {
                return callback.apply(this, [patchArgs, origOrRval])
            } catch (e) {
                console.error(`Patch ${name}:${debugKey} threw an error: ${e}`)
                throw new Error(`Patch ${name}:${debugKey} threw an error: ${e}`, { cause: e })
            }
        }

        // Reset the originally "oneTime" argument
        args[3] = undefined!

        // Make the name very unique, so tracing issues are easier
        Object.defineProperty(args[2], 'name', { value: `revenge.patcher.patch:${name}:${debugKey}`, writable: false })

        return args
    }

    const onReturn = (ret: UnpatchFunction) => {
        unpatches.add(ret)

        return () => {
            ret()
            unpatches.delete(ret)
        }
    }

    return {
        after: trapFunctionCallsRecursive(_after, onBeforeCall, onReturn),
        before: trapFunctionCallsRecursive(_before, onBeforeCall, onReturn),
        instead: trapFunctionCallsRecursive(_instead, onBeforeCall, onReturn),
        /**
         * Unpatches all patches created by this instance
         */
        unpatchAll() {
            for (const unpatch of unpatches) {
                unpatch()
                const clups = cleanups.get(unpatch)
                if (clups) for (const cleanup of clups) cleanup()
            }
        },
        /**
         * Destroys this instance, and unreserves the name
         */
        destroy() {
            this.unpatchAll()
            if (!patcherInstances.delete(name))
                console.warn(`Patcher instance with the name "${name}" was not found, and cannot be deleted`)
        },
        /**
         * Whether this instance has been destroyed
         */
        get destroyed() {
            return !patcherInstances.has(name)
        },
        /**
         * The total number of patches created by this instance
         */
        get totalPatches() {
            return unpatches.size
        },
    }
}

export type Patcher = ReturnType<typeof createPatcherInstance>

export type PatchCleanupFunction = () => void
