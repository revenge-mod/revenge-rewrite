import { Observable, type Observer, type ObserverOptions } from '@gullerya/object-observer'

import { EventEmitter } from '@revenge-mod/modules/common'
import { FileModule } from '@revenge-mod/modules/native'

import { getErrorStack } from '@revenge-mod/utils/errors'
import { useObserve, useObserveFiltered } from '@revenge-mod/utils/observables'

import type { AnyObject } from '@revenge-mod/shared/types'

export const storageContextSymbol = Symbol.for('revenge.storage.context')

const loadedStorages = {} as Record<string, AnyObject>

export type ExtendedObservable<T extends object = object> = Observable & {
    [storageContextSymbol]: {
        emitter: EventEmitter<{
            set: (data: { path: string[]; value: any }) => void
            delete: (data: { path: string[] }) => void
        }>
        error?: any
        readyPromise: Promise<void>
        ready: boolean
        file: ReturnType<typeof createJSONFile<T>>
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
        delete: () => FileModule.removeFile('documents', path),
    }

    return file
}

// TODO: Document this
export function useObserveStorage(observables: ExtendedObservable[], opts?: ObserverOptions) {
    for (const o of observables) {
        const err = o[storageContextSymbol].error
        if (err)
            throw new Error(`An error occured while initializing the storage: ${getErrorStack(err)}`, {
                cause: err,
            })
    }

    return useObserve(observables, opts)
}

export function useObserveStorageFiltered(
    observable: ExtendedObservable,
    filter: (...args: Parameters<Observer>) => boolean,
    opts?: ObserverOptions,
) {
    const err = observable[storageContextSymbol].error
    if (err) throw new Error(`An error occured while initializing the storage: ${getErrorStack(err)}`, { cause: err })
    return useObserveFiltered(observable, filter, opts)
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

    const backend = createJSONFile<T>(path)

    const context = {
        emitter: new EventEmitter(),
        ready: false,
        readyPromise,
        file: backend,
    } as ExtendedObservable<T>[typeof storageContextSymbol]

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
