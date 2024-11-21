import { lazyValue } from '@revenge-mod/utils/lazy'
import { byDisplayName, byFilePath, byName, byProps, byQuery, bySingleProp, byStoreName, byTypeName } from './filters'
import { cacherFor, modulesForFinder, requireModule } from './metro'
import { createLazyModule, lazyContextSymbol } from './utils/lazy'

import type { FilterFn, Metro } from './types'

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

            for (const [id, moduleExports] of modulesForFinder(filter.key)) {
                const { exports, isDefaultExport } = filterExports(moduleExports, id, filter)
                if (typeof exports !== 'undefined') {
                    cache(id, exports)
                    found = true
                    yield [id, isDefaultExport]
                }
            }

            finish(found)
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
                if (typeof id !== 'number') return
                yield isDefaultExport ? requireModule(id).default : requireModule(id)
            }
        },
        eager: function findModuleEager<A extends unknown[]>(filter: FilterFn<A>) {
            const [id, defaultExport] = findId(filter)
            // id can be 0
            if (typeof id !== 'number') return
            return defaultExport ? requireModule(id).default : requireModule(id)
        },
    },
)

// TODO: Type all of these, properly, with generics
// TODO: Convert to functions, so stack traces look good

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
export const findByProps = Object.assign((prop: string, ...props: string[]) => find(byProps(prop, ...props)), {
    async(prop: string, ...propsAndOrTimeout: [...string[], number] | string[]) {
        const cloned = [...propsAndOrTimeout]
        const timeout = typeof cloned[cloned.length - 1] === 'number' ? (cloned.pop() as number) : 1000
        return new Promise<Metro.ModuleExports>(resolve => {
            const id = setTimeout(resolve, timeout)
            findByProps(prop, ...(cloned as string[]))[lazyContextSymbol].getExports((exp: Metro.ModuleExports) => {
                clearTimeout(id)
                resolve(exp)
            })
        })
    },
    eager: (prop: string, ...props: string[]) => find.eager(byProps(prop, ...props)),
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
    all: (prop: string, ...props: string[]) => find.all(byProps(prop, ...props)),
})

/**
 * Finds an export by its name
 *
 * - Filter: `m.name === name`
 * - Returns: `m`, or `{ default: m }` if `returnDefaultExport` is `false`
 *
 * @param name The name to search for
 * @param returnDefaultExport Whether to return the default export instead of the whole module
 * @returns The module exports
 */
export const findByName = Object.assign(
    (name: string, returnDefaultExport = true) => find(returnDefaultExport ? byName(name) : byName.raw(name)),
    {
        async(name: string, returnDefaultExport = true, timeout = 1000) {
            return new Promise<Metro.ModuleExports>(resolve => {
                const id = setTimeout(resolve, timeout)
                findByName(name, returnDefaultExport)[lazyContextSymbol].getExports((exp: Metro.ModuleExports) => {
                    clearTimeout(id)
                    resolve(exp)
                })
            })
        },
        eager: (name: string, returnDefaultExport = true) =>
            find.eager(returnDefaultExport ? byName(name) : byName.raw(name)),
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
        all: (name: string, returnDefaultExport = true) =>
            find.all(returnDefaultExport ? byName(name) : byName.raw(name)),
    },
)

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
    (name: string, returnDefaultExport = true) =>
        find(returnDefaultExport ? byDisplayName(name) : byDisplayName.raw(name)),
    {
        async(name: string, returnDefaultExport = true, timeout = 1000) {
            return new Promise<Metro.ModuleExports>(resolve => {
                const id = setTimeout(resolve, timeout)
                findByDisplayName(name, returnDefaultExport)[lazyContextSymbol].getExports(
                    (exp: Metro.ModuleExports) => {
                        clearTimeout(id)
                        resolve(exp)
                    },
                )
            })
        },
        eager: (name: string, returnDefaultExport = true) =>
            find.eager(returnDefaultExport ? byDisplayName(name) : byDisplayName.raw(name)),
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
        all: (name: string, returnDefaultExport = true) =>
            find.all(returnDefaultExport ? byDisplayName(name) : byDisplayName.raw(name)),
    },
)

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
    (name: string, returnDefaultExport = true) => find(returnDefaultExport ? byTypeName(name) : byTypeName.raw(name)),
    {
        async(name: string, returnDefaultExport = true, timeout = 1000) {
            return new Promise<Metro.ModuleExports>(resolve => {
                const id = setTimeout(resolve, timeout)
                findByTypeName(name, returnDefaultExport)[lazyContextSymbol].getExports((exp: Metro.ModuleExports) => {
                    clearTimeout(id)
                    resolve(exp)
                })
            })
        },
        eager: (name: string, returnDefaultExport = true) =>
            find.eager(returnDefaultExport ? byTypeName(name) : byTypeName.raw(name)),
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
        all: (name: string, returnDefaultExport = true) =>
            find.all(returnDefaultExport ? byTypeName(name) : byTypeName.raw(name)),
    },
)

/**
 * Finds an export by its store name
 *
 * - Filter: `m.getName?.length === 0 && m.getName() === name`
 * - Returns: `m`
 *
 * @param name The store name to search for
 * @returns The module exports
 */
export const findByStoreName = Object.assign((name: string) => find(byStoreName(name)), {
    async(name: string, timeout = 5000) {
        return new Promise<Metro.ModuleExports>(resolve => {
            const id = setTimeout(resolve, timeout)
            findByStoreName(name)[lazyContextSymbol].getExports((exp: Metro.ModuleExports) => {
                clearTimeout(id)
                resolve(exp)
            })
        })
    },
    eager: (name: string) => find.eager(byStoreName(name)),
})

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
    (path: string, returnDefaultExport = true) => find(byFilePath(path, returnDefaultExport)),
    {
        async(path: string, returnDefaultExport = true, timeout = 1000) {
            return new Promise<Metro.ModuleExports>(resolve => {
                const id = setTimeout(resolve, timeout)
                findByFilePath(path, returnDefaultExport)[lazyContextSymbol].getExports((exp: Metro.ModuleExports) => {
                    clearTimeout(id)
                    resolve(exp)
                })
            })
        },
        eager: (path: string, returnDefaultExport = true) => find.eager(byFilePath(path, returnDefaultExport)),
    },
)

/**
 * Finds an export by its properties, and accesses it directly
 *
 * - Filter: `m[prop] && props.every(p => m[p])`
 * - Returns: `m[prop]`
 *
 * @param prop The property to search for and access
 * @param filterProps Additional properties to search for
 * @returns The value of the module's exports' property
 */
export const findProp = Object.assign(
    (prop: string, ...filterProps: string[]) => lazyValue(() => findByProps(prop, ...filterProps)[prop]),
    {
        async: (prop: string, ...filterPropsAndOrTimeout: [...string[], number] | string[]) =>
            findByProps.async(prop, ...filterPropsAndOrTimeout).then(exports => exports[prop]),
        eager: (prop: string, ...filterProps: string[]) => findByProps.eager(prop, ...filterProps)[prop],
    },
)

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
    (name: string, returnDefaultExport = true) =>
        find(returnDefaultExport ? bySingleProp(name) : bySingleProp.raw(name)),
    {
        async(name: string, returnDefaultExport = true, timeout = 1000) {
            return new Promise<Metro.ModuleExports>(resolve => {
                const id = setTimeout(resolve, timeout)
                findBySingleProp(name, returnDefaultExport)[lazyContextSymbol].getExports(
                    (exp: Metro.ModuleExports) => {
                        clearTimeout(id)
                        resolve(exp)
                    },
                )
            })
        },
        eager: (name: string, returnDefaultExport = true) =>
            find.eager(returnDefaultExport ? bySingleProp(name) : bySingleProp.raw(name)),
    },
)

/**
 * Finds an export by a query string **(very expensive, only use for debugging)**
 * @param query The query string to search for
 * @param caseSensitive Whether the search should be case-sensitive
 * @returns The module exports
 */
export const findByQuery = Object.assign(
    () => {
        throw new Error('Lazy finding for byQuery(...) is not supported, use findByQuery.eager(...) instead')
    },
    {
        eager: (query: string, caseSensitive = false) => find(byQuery(query, caseSensitive)),
        /**
         * Yields all exports that match a query string **(very expensive, only use for debugging)**
         * @param query The query string to search for
         * @param caseSensitive Whether the search should be case-sensitive
         * @returns All module exports
         */
        all: (query: string, caseSensitive = false) => find.all(byQuery(query, caseSensitive)),
    },
)
