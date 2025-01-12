import { lazyValue } from '@revenge-mod/utils/lazy'
import { byDisplayName, byFilePath, byName, byProps, byQuery, bySingleProp, byStoreName, byTypeName } from './filters'
import { modulesForFinder, requireModule } from './metro'
import { cacherFor } from './metro/caches'
import { createLazyModule, lazyContextSymbol } from './utils/lazy'

import type { If, Nullable as Undefinable } from '@revenge-mod/shared/types'
import type { FilterFn, LazyModule, Metro } from './types'

function filterExports<A extends unknown[]>(moduleExports: Metro.ModuleExports, moduleId: number, filter: FilterFn<A>) {
    if (moduleExports.default && moduleExports.__esModule && filter(moduleExports.default, moduleId, true)) {
        return {
            exports: filter.raw ? moduleExports : moduleExports.default,
            isDefaultExport: !filter.raw,
        }
    }

    if (!filter.raw && filter(moduleExports, moduleId, false)) {
        return { exports: moduleExports, isDefaultExport: false }
    }

    return {}
}

/**
 * Finds the first module where the given filter returns a truthy value
 * @param filter The filter to match
 * @returns An object containing the module ID and exports of the first module which the given filter matches
 */
export const findId = Object.assign(
    function findModuleId<A extends unknown[]>(filter: FilterFn<A>) {
        const { cache, finish } = cacherFor(filter.key)

        for (const [id, moduleExports] of modulesForFinder(filter.key)) {
            const { exports, isDefaultExport } = filterExports(moduleExports, id, filter)
            if (typeof exports !== 'undefined') {
                cache(id, exports)
                finish(false)
                return [id, isDefaultExport]
            }
        }

        finish(true)
        return []
    },
    {
        /**
         * Yields all modules where filter returns a truthy value.
         * @param filter The filter to match
         * @returns A generator that yields an array containing the module ID and whether the export is the default export
         */
        all: function* findModuleIdAll<A extends unknown[]>(filter: FilterFn<A>) {
            const { cache, finish } = cacherFor(filter.key)

            let found = false

            for (const [id, moduleExports] of modulesForFinder(filter.key, true)) {
                const { exports, isDefaultExport } = filterExports(moduleExports, id, filter)
                if (typeof exports !== 'undefined') {
                    cache(id, exports)
                    found = true
                    yield [id, isDefaultExport]
                }
            }

            finish(found, true)
        },
    },
)

/**
 * Finds an export where the given filter returns a truthy value
 * @param filter The filter to match
 * @returns The exports of the first module which the given filter matches
 */
export const find = Object.assign(
    function findModule<A extends unknown[]>(filter: FilterFn<A>) {
        return createLazyModule(filter)
    },
    {
        /**
         * Returns all exports where filter returns a truthy value.
         * @param filter The filter to match
         * @returns An array of exports
         */
        all: function* findModuleAll<A extends unknown[]>(filter: FilterFn<A>) {
            for (const [id, isDefaultExport] of findId.all(filter)) {
                if (typeof id === 'number') yield isDefaultExport ? requireModule(id).default : requireModule(id)
            }
        },
        eager: function findModuleEager<A extends unknown[]>(filter: FilterFn<A>) {
            const [id, defaultExport] = findId(filter)
            // id can be 0
            if (typeof id === 'number') return defaultExport ? requireModule(id).default : requireModule(id)
        },
    },
)

export type NonExact<T = unknown> = Branded<T, 'NonExact'>

export type ByProps<
    Struct = Record<string, Metro.ModuleExports[string]>,
    AdditionalProps extends string = string,
> = Undefinable<
    Struct extends NonExact
        ? Struct & {
              [Key in AdditionalProps]: Metro.ModuleExports[Key]
          } & {
              [Key in PropertyKey]: Metro.ModuleExports[Key]
          }
        : Struct
>

/**
 * Finds an export with specified properties
 *
 * - Filter: `m[prop] && props.every(p => m[p])`
 * - Returns: `m`
 *
 * @param prop The property to search for
 * @param props Additional properties to search for
 * @returns The module exports
 */
export const findByProps = Object.assign(
    function findByPropsLazy<T = Record<string, Metro.ModuleExports[string]>, P extends string = string>(
        prop: keyof T,
        ...props: P[]
    ) {
        return find(byProps(prop as string, ...(props as string[]))) as LazyModule<ByProps<T, P>>
    },
    {
        async: function findByPropsAsync<T = Record<string, Metro.ModuleExports[string]>, P extends string = string>(
            prop: keyof T,
            ...propsAndOrTimeout: [...P[], number] | P[]
        ) {
            const cloned = [...propsAndOrTimeout]
            const timeout = typeof cloned[cloned.length - 1] === 'number' ? (cloned.pop() as number) : 1000
            return new Promise<ByProps<T, P>>(resolve => {
                const id = setTimeout(() => resolve(undefined), timeout)
                findByProps(prop, ...(cloned as string[]))![lazyContextSymbol].getExports(
                    (exp: Metro.ModuleExports) => {
                        clearTimeout(id)
                        resolve(exp)
                    },
                )
            })
        },
        eager: function findByPropsEager<T = Record<string, Metro.ModuleExports[string]>, P extends string = string>(
            prop: keyof T,
            ...props: P[]
        ) {
            return find.eager(byProps(prop as string, ...(props as string[]))) as ByProps<T, P>
        },
        /**
         * Yield all exports with specified properties
         *
         * - Filter: `m[prop] && props.every(p => m[p])`
         * - Returns: `m`
         *
         * @param prop The property to search for
         * @param props Additional properties to search for
         * @returns The module exports
         */
        all: function findByPropsAll<T = Record<string, Metro.ModuleExports[string]>, K extends string = string>(
            prop: keyof T,
            ...props: K[]
        ) {
            type IteratorValue = Undefinable<
                T & {
                    [Key in K]: Metro.ModuleExports[Key]
                }
            >
            return find.all(byProps(prop as string, ...(props as string[]))) as Iterator<
                IteratorValue,
                IteratorValue,
                IteratorValue
            >
        },
    },
)

export type ByName<Value extends { name: string }, DefaultExport extends boolean> = Undefinable<
    If<DefaultExport, ByNameDefaultExport<Value>, { default: ByNameDefaultExport<Value> }>
>

type ByNameDefaultExport<V extends { name: string }> = NonNullable<ByProps<V>>

/**
 * Returns an export with matching name
 *
 * - Filter: `m.name === name`
 * - Yields: `m`, or `{ default: m }` if `returnDefaultExport` is `false`
 *
 * @param name The name to search for
 * @param returnDefaultExport Whether to return the default export instead of the whole module
 * @returns The module exports
 */
export const findByName = Object.assign(
    function findByNameLazy<V extends { name: string }, D extends boolean>(
        name: V['name'],
        returnDefaultExport: D = true as D,
    ) {
        return find(returnDefaultExport ? byName(name) : byName.raw(name)) as LazyModule<ByName<V, D>>
    },
    {
        async: function findByNameAsync<V extends { name: string }, D extends boolean>(
            name: V['name'],
            returnDefaultExport: D = true as D,
            timeout = 1000,
        ) {
            return new Promise<ByName<V, D>>(resolve => {
                const id = setTimeout(() => resolve(undefined), timeout)
                findByName(name, returnDefaultExport)![lazyContextSymbol].getExports((exp: Metro.ModuleExports) => {
                    clearTimeout(id)
                    resolve(exp)
                })
            })
        },
        eager: function findByNameEager<V extends { name: string }, D extends boolean>(
            name: V['name'],
            returnDefaultExport: D = true as D,
        ) {
            return find.eager(returnDefaultExport ? byName(name) : byName.raw(name)) as ByName<V, D>
        },
        /**
         * Yields all exports with matching name
         *
         * - Filter: `m.name === name`
         * - Yields: `m`, or `{ default: m }` if `returnDefaultExport` is `false`
         *
         * @param name The name to search for
         * @param returnDefaultExport Whether to return the default export instead of the whole module
         * @returns The module exports
         */
        all: function findByNameAll<V extends { name: string }, D extends boolean>(
            name: V['name'],
            returnDefaultExport: D = true as D,
        ) {
            type IteratorValue = ByName<V, D>

            return find.all(returnDefaultExport ? byName(name) : byName.raw(name)) as Iterator<
                IteratorValue,
                IteratorValue,
                IteratorValue
            >
        },
    },
)

export type ByDisplayName<Value extends { displayName: string }, DefaultExport extends boolean> = Undefinable<
    If<DefaultExport, ByDisplayNameDefaultExport<Value>, { default: ByDisplayNameDefaultExport<Value> }>
>

type ByDisplayNameDefaultExport<V extends { displayName: string }> = NonNullable<ByProps<V>>

/**
 * Finds an export by its display name
 *
 * - Filter: `m.displayName === name`
 * - Returns: `m`, or `{ default: m }` if `returnDefaultExport` is `false`
 *
 * @param name The display name to search for
 * @param returnDefaultExport Whether to return the default export instead of the whole module
 * @returns The module exports
 */
export const findByDisplayName = Object.assign(
    function findByDisplayNameLazy<V extends { displayName: string }, D extends boolean>(
        name: V['displayName'],
        returnDefaultExport: D = true as D,
    ) {
        return find(returnDefaultExport ? byDisplayName(name) : byDisplayName.raw(name)) as LazyModule<
            ByDisplayName<V, D>
        >
    },
    {
        async: function findByDisplayNameAsync<V extends { displayName: string }, D extends boolean>(
            name: V['displayName'],
            returnDefaultExport: D = true as D,
            timeout = 1000,
        ) {
            return new Promise<ByDisplayName<V, D>>(resolve => {
                const id = setTimeout(() => resolve(undefined), timeout)
                findByDisplayName(name, returnDefaultExport)![lazyContextSymbol].getExports(
                    (exp: Metro.ModuleExports) => {
                        clearTimeout(id)
                        resolve(exp)
                    },
                )
            })
        },
        eager: function findByDisplayNameEager<V extends { displayName: string }, D extends boolean>(
            name: V['displayName'],
            returnDefaultExport: D = true as D,
        ) {
            return find.eager(returnDefaultExport ? byDisplayName(name) : byDisplayName.raw(name)) as ByDisplayName<
                V,
                D
            >
        },
        /**
         * Yields all exports with matching display name
         *
         * - Filter: `m.displayName === name`
         * - Yields: `m`, or `{ default: m }` if `returnDefaultExport` is `false`
         *
         * @param name The display name to search for
         * @param returnDefaultExport Whether to return the default export instead of the whole module
         * @returns The module exports
         */
        all: function findByDisplayNameAll<V extends { displayName: string }, D extends boolean>(
            name: V['displayName'],
            returnDefaultExport: D = true as D,
        ) {
            type IteratorValue = ByDisplayName<V, D>

            return find.all(returnDefaultExport ? byDisplayName(name) : byDisplayName.raw(name)) as Iterator<
                IteratorValue,
                IteratorValue,
                IteratorValue
            >
        },
    },
)

export type ByTypeName<Value extends { type: { name: string } }, DefaultExport extends boolean> = Undefinable<
    If<DefaultExport, ByTypeNameDefaultExport<Value>, { default: ByTypeNameDefaultExport<Value> }>
>

type ByTypeNameDefaultExport<V extends { type: { name: string } }> = NonNullable<ByProps<V>>

/**
 * Finds an export by its type name (`x.type.name`)
 *
 * - Filter: `m.type.name === name`
 * - Returns: `m`, or `{ default: m }` if `returnDefaultExport` is `false`
 *
 * @param name The type name to search for
 * @param returnDefaultExport Whether to return the default export instead of the whole module
 * @returns The module exports
 */
export const findByTypeName = Object.assign(
    function findByTypeNameLazy<V extends { type: { name: string } }, D extends boolean>(
        name: V['type']['name'],
        returnDefaultExport: D = true as D,
    ) {
        return find(returnDefaultExport ? byTypeName(name) : byTypeName.raw(name)) as LazyModule<ByTypeName<V, D>>
    },
    {
        async: function findByTypeNameAsync<V extends { type: { name: string } }, D extends boolean>(
            name: V['type']['name'],
            returnDefaultExport: D = true as D,
            timeout = 1000,
        ) {
            return new Promise<ByTypeName<V, D>>(resolve => {
                const id = setTimeout(() => resolve(undefined), timeout)
                findByTypeName(name, returnDefaultExport)![lazyContextSymbol].getExports((exp: Metro.ModuleExports) => {
                    clearTimeout(id)
                    resolve(exp)
                })
            })
        },
        eager: function findByTypeNameEager<V extends { type: { name: string } }, D extends boolean>(
            name: V['type']['name'],
            returnDefaultExport: D = true as D,
        ) {
            return find.eager(returnDefaultExport ? byTypeName(name) : byTypeName.raw(name)) as ByTypeName<V, D>
        },
        /**
         * Yields all exports by its type name (`x.type.name`)
         *
         * - Filter: `m.type.name === name`
         * - Returns: `m`, or `{ default: m }` if `returnDefaultExport` is `false`
         *
         * @param name The type name to search for
         * @param returnDefaultExport Whether to return the default export instead of the whole module
         * @returns The module exports
         */
        all: function findByTypeNameAll<V extends { type: { name: string } }, D extends boolean>(
            name: V['type']['name'],
            returnDefaultExport: D = true as D,
        ) {
            type IteratorValue = ByTypeName<V, D>

            return find.all(returnDefaultExport ? byTypeName(name) : byTypeName.raw(name)) as Iterator<
                IteratorValue,
                IteratorValue,
                IteratorValue
            >
        },
    },
)

export type ByStoreName<Value extends { getName(): string }> = ByProps<Value>

/**
 * Finds an export by its store name
 *
 * - Filter: `m.getName?.length === 0 && m.getName() === name`
 * - Returns: `m`
 *
 * @param name The store name to search for
 * @returns The module exports
 */
export const findByStoreName = Object.assign(
    function findByStoreNameLazy<V extends { getName(): string }>(name: ReturnType<V['getName']>) {
        return find(byStoreName(name)) as LazyModule<ByStoreName<V>>
    },
    {
        async: function findByStoreNameAsync<V extends { getName(): string }>(
            name: ReturnType<V['getName']>,
            timeout = 5000,
        ) {
            return new Promise<ByStoreName<V>>(resolve => {
                const id = setTimeout(() => resolve(undefined), timeout)
                findByStoreName(name)![lazyContextSymbol].getExports((exp: Metro.ModuleExports) => {
                    clearTimeout(id)
                    resolve(exp)
                })
            })
        },
        eager: function findByStoreNameEager<V extends { getName(): string }>(name: ReturnType<V['getName']>) {
            return find.eager(byStoreName(name)) as ByStoreName<V>
        },
    },
)

export type ByFilePath<T extends Metro.ModuleExports, DefaultExport extends boolean> = ByProps<
    If<DefaultExport, T, { default: T }>
>

/**
 * Finds an export by its imported file path. Useful for finding modules whose properties are not very unique.
 *
 * - Returns: `m`, or `{ default: m }` if `returnDefaultExport` is `false`
 *
 * @param path The file path to search for
 * @param returnDefaultExport Whether to return the default export instead of the whole module **(default is `true`)**
 * @returns The module exports
 */
export const findByFilePath = Object.assign(
    function findByFilePathLazy<T extends Metro.ModuleExports, D extends boolean>(
        path: string,
        returnDefaultExport: D = false as D,
    ) {
        return find(byFilePath(path, returnDefaultExport)) as LazyModule<ByFilePath<T, D>>
    },
    {
        async: function findByFilePathAsync<T extends Metro.ModuleExports, D extends boolean>(
            path: string,
            returnDefaultExport: D = true as D,
            timeout = 1000,
        ) {
            return new Promise<ByFilePath<T, D>>(resolve => {
                const id = setTimeout(() => resolve(undefined), timeout)
                findByFilePath(path, returnDefaultExport)![lazyContextSymbol].getExports((exp: Metro.ModuleExports) => {
                    clearTimeout(id)
                    resolve(exp)
                })
            })
        },
        eager: function findByFilePathEager<T extends Metro.ModuleExports, D extends boolean>(
            path: string,
            returnDefaultExport = true,
        ) {
            return find.eager(byFilePath(path, returnDefaultExport)) as ByFilePath<T, D>
        },
    },
)

/**
 * Finds an export by its properties, and accesses it directly.
 * **This is not reliable for non-object-like values (eg. strings, numbers, booleans) since we cannot create proxies for those types
 * , only `findProp.async` and `findProp.eager` are reliable for such things.**
 *
 * - Filter: `m[prop] && props.every(p => m[p])`
 * - Returns: `m[prop]`
 *
 * @param prop The property to search for and access
 * @param filterProps Additional properties to search for
 * @returns The value of the module's exports' property
 */
export const findProp = Object.assign(
    function findPropLazy<T extends Metro.ModuleExports>(prop: string, ...filterProps: string[]) {
        return lazyValue(() => findByProps.eager(prop, ...filterProps)?.[prop]) as LazyModule<Undefinable<T>>
    },
    {
        async: function findPropAsync<T extends Metro.ModuleExports>(
            prop: string,
            ...filterPropsAndOrTimeout: [...string[], number] | string[]
        ) {
            return findByProps.async(prop, ...filterPropsAndOrTimeout).then(exports => exports?.[prop]) as Promise<
                Undefinable<T>
            >
        },
        eager: function findPropEager<T extends Metro.ModuleExports>(prop: string, ...filterProps: string[]) {
            return findByProps.eager(prop, ...filterProps)?.[prop] as Undefinable<T>
        },
    },
)

export type BySingleProp<Value, Key extends string> = Undefinable<{ [K in Key]: Value }>

/**
 * Finds an export by its single property
 *
 * - Filter: `m[prop] && Object.keys(m).length === 1`
 * - Returns: `m`
 *
 * @param name The property to search for
 * @param returnDefaultExport Whether to return the default export instead of the whole module
 * @returns The module exports
 */
export const findBySingleProp = Object.assign(
    function findBySinglePropLazy<T, K extends string>(name: K) {
        return find(bySingleProp(name)) as LazyModule<BySingleProp<T, K>>
    },
    {
        async: function findBySinglePropAsync<T, K extends string>(name: K, timeout = 1000) {
            return new Promise<BySingleProp<T, K>>(resolve => {
                const id = setTimeout(() => resolve(undefined), timeout)
                findBySingleProp(name)![lazyContextSymbol].getExports((exp: Metro.ModuleExports) => {
                    clearTimeout(id)
                    resolve(exp)
                })
            })
        },
        eager: function findBySinglePropEager<T, K extends string>(name: K) {
            return find.eager(bySingleProp(name as string)) as BySingleProp<T, K>
        },
    },
)

export const findSingleProp = Object.assign(
    function findSinglePropLazy<T>(name: string) {
        return lazyValue(() => findBySingleProp.eager(name)?.[name]) as LazyModule<Undefinable<T>>
    },
    {
        async: function findSinglePropAsync<T>(name: string, timeout = 1000) {
            return findBySingleProp.async(name, timeout).then(exports => exports?.[name]) as Promise<Undefinable<T>>
        },
        eager: function findSinglePropEager<T>(name: string) {
            return findBySingleProp.eager(name)?.[name] as Undefinable<T>
        },
    },
)

/**
 * Finds an export by a query string **(very expensive, only use for debugging)**
 * @param query The query string to search for
 * @param caseSensitive Whether the search should be case-sensitive
 * @returns The module exports
 */
export const findByQuery = Object.assign(
    function findByQueryLazy() {
        throw new Error('Lazy finding for byQuery(...) is not supported, use findByQuery.eager(...) instead')
    },
    {
        eager: function findByQueryEager(query: string, caseSensitive = false) {
            return find(byQuery(query, caseSensitive))
        },
        /**
         * Yields all exports that match a query string **(very expensive, only use for debugging)**
         * @param query The query string to search for
         * @param caseSensitive Whether the search should be case-sensitive
         * @returns All module exports
         */
        all: function findByQueryAll(query: string, caseSensitive = false) {
            return find.all(byQuery(query, caseSensitive))
        },
    },
)
