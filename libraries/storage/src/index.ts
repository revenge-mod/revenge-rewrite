import { Observable, type ObserverOptions } from '@gullerya/object-observer'
import { EventEmitter } from '@revenge-mod/modules/common'
import { FileModule } from '@revenge-mod/modules/native'
import type { AnyObject } from '@revenge-mod/shared/types'

export const storageContextSymbol = Symbol.for('revenge.storage.context')

const loadedStorages = {} as Record<string, AnyObject>

export type ExtendedObservable = Observable & {
    [storageContextSymbol]: {
        emitter: EventEmitter<{
            set: (data: { path: string[]; value: any }) => void
            delete: (data: { path: string[] }) => void
        }>
        error: any
        readyPromise: Promise<void>
        ready: boolean
    }
}

function createJSONFile<T extends object>(path: string) {
    const actualPath = `${FileModule.getConstants().DocumentsDirPath}/${path}`

    const file = {
        read: async () => {
            try {
                return JSON.parse(await FileModule.readFile(actualPath, 'utf8')) as T
            } catch (e) {
                throw new Error(`Failed to parse storage from: ${actualPath}`, { cause: e })
            }
        },
        write: (data: T) => {
            if (!data || typeof data !== 'object') {
                throw new Error('Data to write needs to be an object')
            }

            return FileModule.writeFile('documents', path, JSON.stringify(data), 'utf8')
        },
        exists: () => FileModule.fileExists(actualPath),
    }

    return file
}

// TODO: Document this
export function useObservable(observables: ExtendedObservable[], opts?: ObserverOptions) {
    if (observables.some(o => o?.[storageContextSymbol]?.error))
        throw new Error('An error occured while initializing the storage')

    if (observables.some(o => !Observable.isObservable(o))) {
        throw new Error("Argument passed isn't an Observable")
    }

    const [, forceUpdate] = React.useReducer(n => ~n, 0)

    // biome-ignore lint/correctness/useExhaustiveDependencies: We manually re-render when needed
    React.useEffect(() => {
        const listener = () => forceUpdate()

        for (const o of observables) Observable.observe(o, listener, opts)

        return () => {
            for (const o of observables) Observable.unobserve(o, listener)
        }
    }, [])
}

/**
 * Save a storage to the file system
 * @param path The path to the storage
 * @param value The value to save
 */
export async function saveStorage<T extends AnyObject = AnyObject>(path: string, value: T): Promise<void> {
    loadedStorages[path] = value
    createJSONFile<T>(path).write(value)
}

/**
 * Create a new storage or load one if it already exists
 * @param path The path to the storage
 * @param param1 The options for the storage
 * @returns The storage
 */
export function createStorage<T extends AnyObject = AnyObject>(
    path: string,
    { initial = {} as T } = {},
): T & ExtendedObservable {
    const readyPromise = new Promise<void>(r => (resolve = r))
    let resolve: () => void
    let proxy: Observable

    const context = {
        emitter: new EventEmitter(),
        ready: false,
        readyPromise,
    } as ExtendedObservable[typeof storageContextSymbol]

    const callback = (data: AnyObject | null) => {
        const observable = Observable.from(data)
        Observable.observe(observable, changes => {
            for (const change of changes) {
                context.emitter.emit(change.type !== 'delete' ? 'set' : 'delete', {
                    path: change.path,
                    value: change.value,
                })
            }

            backend.write(observable)
        })

        const _proxy = new Proxy(observable, {
            get(target, prop, receiver) {
                if (prop === storageContextSymbol) return context
                return Reflect.get(target, prop, receiver)
            },
        }) as ExtendedObservable

        context.ready = true
        resolve()
        return (proxy = _proxy)
    }

    const backend = createJSONFile<T>(path)

    if (loadedStorages[path]) {
        callback(loadedStorages[path])
    } else {
        backend.exists().then(async exists => {
            if (!exists) {
                loadedStorages[path] = initial
                await backend.write(initial)
                callback(initial)
            } else {
                callback((loadedStorages[path] = await backend.read()))
            }
        })
    }

    const check = () => {
        if (proxy) return true
        throw new Error(`Storage has not been initialized: ${path}`)
    }

    return new Proxy(
        {},
        {
            ...Object.fromEntries(
                Object.getOwnPropertyNames(Reflect).map(k => [
                    k,
                    (_: unknown, ...args: unknown[]) => {
                        // @ts-expect-error
                        return check() && Reflect[k](proxy, ...args)
                    },
                ]),
            ),
            get(_, prop, recv) {
                if (prop === storageContextSymbol) return context
                return check() && Reflect.get(proxy, prop, recv)
            },
        },
    ) as T & ExtendedObservable
}

/**
 * Load a storage from the file system to memory
 * @param path The path to the storage
 * @returns Whether the storage was loaded or not
 */
export async function loadStorage(path: string): Promise<boolean> {
    if (loadedStorages[path]) return true

    const backend = createJSONFile(path)
    if (await backend.exists()) {
        loadedStorages[path] = await backend.read()
        return false
    }

    return true
}

/**
 * Remove a storage from the cache and the file system
 * @param path The path to the storage
 */
export async function removeStorage(path: string) {
    await FileModule.removeFile('documents', path)
    delete loadedStorages[path]
}

/**
 * Wait for storage(s) to be loaded
 * @param storages The storage(s) to wait for
 * @returns A promise that resolves when all storages given are loaded
 */
export function awaitStorage(...storages: ExtendedObservable[]) {
    return Promise.all(storages.map(proxy => proxy[storageContextSymbol].readyPromise))
}

/** @internal */
export function getPreloadedStorage<T extends AnyObject = AnyObject>(path: string): T | undefined {
    return loadedStorages[path]
}