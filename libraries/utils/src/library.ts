import { type Patcher, createPatcherInstance } from '@revenge-mod/patcher'
import { lazyDestructure } from './lazy'

const registeredLibraries = new Map<
    string,
    {
        // biome-ignore lint/suspicious/noExplicitAny: No
        factory: Library<string, any, unknown>
        // biome-ignore lint/suspicious/noExplicitAny: Nuh uh
        context: LibraryCallbackContext<any>
        instance?: unknown
        awaitedInstance?: unknown
    }
>()

function createLibrary<Name extends string, Features extends LibraryFeatures, Return>(
    { name, uses: features }: LibraryOptions<Name, Features>,
    callback: (context: LibraryCallbackContext<Features>) => Return,
) {
    const id = `revenge.library.${name}` as const
    const tag = `[revenge.${name}]`

    const cleanups: LibraryCleanupFunction[] = []

    const patcher = features.includes('patcher') ? createPatcherInstance(id) : undefined
    const logger = features.includes('logger')
        ? {
              log: (message: string) => console.log(`${tag} ${message}`),
              warn: (message: string) => console.warn(`${tag} ${message}`),
              error: (message: string) => console.error(`${tag} ${message}`),
          }
        : undefined

    const registered = {
        context: {
            patcher,
            logger,
            cleanup: cleanup => void cleanups.push(cleanup),
        } as LibraryCallbackContext<Features>,
        // ^^ as works, but not satisfies

        factory: {
            name,
            id,
            new: function newLibrary() {
                if (registered.instance) throw new Error('Library already has an instance')
                const instance = callback(registered.context)
                registered.instance = instance
                if (instance instanceof Promise) instance.then(inst => (registered.awaitedInstance = inst))
                else registered.awaitedInstance = registered.instance as Awaited<Return>
                return instance
            },
            destroy: function destroyLibrary() {
                for (const cleanup of cleanups) cleanup()
                if (patcher) patcher.destroy()
                registered.instance = undefined
                registered.awaitedInstance = undefined
            },
            features: features as Features[],
        } satisfies Library<Name, Features, Return>,
    } as {
        factory: Library<Name, Features, Return>
        instance?: Return
        awaitedInstance?: Awaited<Return>
        context: LibraryCallbackContext<Features>
    }

    Object.defineProperty(registered.factory.new, 'name', {
        value: `newLibrary:${registered.factory.id}`,
    })

    registeredLibraries.set(id, registered)

    return registered.factory
}

function contextForLibrary<L extends Library<string, LibraryFeatures, unknown>>(library: L) {
    if (!library) throw new Error('Cannot get the context of an uninitialized library')
    return lazyDestructure(
        () => registeredLibraries.get(library.id)?.context as LibraryCallbackContext<L['features'][number]>,
    )
}

function factoryForLibrary<L extends Library<string, LibraryFeatures, unknown>>(library: L) {
    if (!library) throw new Error('Cannot get the factory of an undefined library')
    return lazyDestructure(() => registeredLibraries.get(library.id)?.factory as L)
}

// biome-ignore lint/suspicious/noExplicitAny: This is all fine
function instanceForLibrary<L extends Library<string, LibraryFeatures, any>>(library: L) {
    if (!library) throw new Error('Cannot get an instance of an undefined library')
    if (!registeredLibraries.has(library.id))
        throw new Error('Cannot get an instance of a library that has not been created')
    const instance = registeredLibraries.get(library.id)?.instance as ReturnType<L['new']> | undefined
    if (!instance) throw new Error('Cannot get an instance of a library that has not been initialized')
    return instance
}

function awaitedInstanceFor<L extends Library<string, LibraryFeatures, any>>(library: L) {
    if (!library) throw new Error('Cannot get an instance of an undefined library')
    if (!registeredLibraries.has(library.id))
        throw new Error('Cannot get an instance of a library that has not been created')
    const instance = registeredLibraries.get(library.id)?.awaitedInstance as Awaited<ReturnType<L['new']>> | undefined
    if (!instance) throw new Error('Cannot get an instance of a library that has not been fully initialized')
    return instance
}

const Libraries = {
    create: createLibrary,
    contextFor: contextForLibrary,
    factoryFor: factoryForLibrary,
    instanceFor: instanceForLibrary,
    awaitedInstanceFor: awaitedInstanceFor,
    destroyAll() {
        for (const { factory } of registeredLibraries.values()) factory.destroy()
    },
} as const

export default Libraries

export type Library<Name extends string, Features extends LibraryFeatures, Return> = {
    name: Name
    features: Features[]
    id: `revenge.library.${Name}`
    // biome-ignore lint/complexity/useLiteralKeys: No
    ['new'](): Return
    destroy(): void
}

export type LibraryCleanupFunction = () => void

export interface LibraryOptions<Name extends string = string, Features extends LibraryFeatures = LibraryFeatures> {
    name: Name
    uses: (Features[] & LibraryFeatures[]) | Readonly<Features[] & LibraryFeatures[]>
}

export type LibraryCallbackContext<Features extends LibraryFeatures> = {
    patcher: 'patcher' extends Features ? Patcher : undefined
    logger: 'logger' extends Features
        ? {
              log: (message: string) => void
              warn: (message: string) => void
              error: (message: string) => void
          }
        : undefined
    cleanup: (cleanup: LibraryCleanupFunction) => void
}

export type LibraryFeatures = 'patcher' | 'logger'
