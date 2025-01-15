import { MetroModuleLookupRegistryFlags } from './constants'
import { byProps, bySingleProp } from './filters'
import { blacklistModule, isModuleExportsBad, moduleIdsForFilter, requireModule } from './metro'
import { cache, cacherFor } from './metro/caches'
import { createLazyModule, createLazyModuleById, lazyContextSymbol } from './utils/lazy'

import { lazyValue, type LazyOptions } from '@revenge-mod/utils/lazy'
import type { FilterFunction, InferFilterFunctionReturnType, LazyModule, Metro } from './types'

function* filterExports<F extends FilterFunction<any>>(
    moduleExports: Metro.ModuleExports,
    moduleId: number,
    filter: F,
    opts?: FinderOptions,
): Generator<[exports: Metro.ModuleExports, defaultExport: boolean], void, unknown> {
    if (isModuleExportsBad(moduleExports)) return blacklistModule(moduleId)

    if (!opts?.ignoreDefaultExport && moduleExports.__esModule) {
        const defaultExport = moduleExports.default
        if (!isModuleExportsBad(defaultExport) && filter(defaultExport, moduleId))
            yield opts?.wildcard ? [moduleExports, false] : [defaultExport, true]
    }

    if (filter(moduleExports, moduleId)) yield [moduleExports, false]
}

/**
 * Finds the first module where the given filter returns a truthy value
 * @param filter The filter to match
 * @returns An object containing the module ID and exports of the first module which the given filter matches
 */
export function findModule<F extends FilterFunction<any>>(
    filter: F,
    opts?: FinderOptions,
): [moduleId: Metro.ModuleID, exports: InferFilterFunctionReturnType<F>, defaultExport: boolean] | [] {
    const { cache, finish } = cacherFor(filter.key)

    for (const id of moduleIdsForFilter(filter.key, false)) {
        const exports = requireModule(id)
        const { value } = filterExports(exports, id, filter, opts).next()
        if (value) {
            cache(id)
            finish(0)
            return [id, value[0], value[1]]
        }
    }

    finish(MetroModuleLookupRegistryFlags.NotFound)
    return []
}

/**
 * Yields all modules where filter returns a truthy value.
 * @param filter The filter to match
 * @returns A generator that yields an array containing the module ID and whether the export is the default export
 */
export function* findAllModules<F extends FilterFunction<any>>(
    filter: F,
    opts?: AllFinderOptions<FinderOptions>,
): Generator<
    [moduleId: Metro.ModuleID, exports: InferFilterFunctionReturnType<F>, defaultExport: boolean],
    void,
    unknown
> {
    const { cache, finish } = cacherFor(filter.key)
    let count = 0

    for (const id of moduleIdsForFilter(filter.key, true)) {
        const exports = requireModule(id)
        for (const value of filterExports(exports, id, filter, opts)) {
            cache(id)
            yield [id, value[0], value[1]]
            if (++count > opts?.limit!) break
        }
    }

    finish(MetroModuleLookupRegistryFlags.FullLookup | (count ? 0 : MetroModuleLookupRegistryFlags.NotFound))
}

export type FinderOptions = {
    /**
     * Whether to return the whole module instead of just the default export.
     *
     * CJS modules are not affected by this option, the whole exports will always be returned.
     *
     * @default false
     */
    wildcard?: boolean
    /**
     * Whether the finder should skip filtering the default export (`exports.default`) for ES modules (`exports.__esModule === true`).
     * The default export check is always prioritized over the whole module check.
     *
     * CJS modules are not affected by this option.
     *
     * @default false
     */
    ignoreDefaultExport?: boolean
}

export type AllFinderOptions<B extends FinderOptions> = B & {
    /**
     * The limit of modules to search for
     */
    limit?: number
}

export type LazyFinderOptions<L extends LazyOptions = LazyOptions> = FinderOptions & {
    /**
     * The options for lazy modules
     */
    lazyOptions?: L
}

export type AsyncFinderOptions = LazyFinderOptions & {
    /**
     * The timeout in milliseconds before the promise resolves with undefined if nothing is found
     * @default 3000
     */
    timeout?: number
}

export type LazyFinderReturn<
    F extends FilterFunction<any>,
    LF extends LazyFinderOptions,
> = LF extends LazyFinderOptions<LazyOptions<infer E>> ? LazyModule<FinderReturn<F, LF>> & E : never

export type FinderReturn<F extends FilterFunction<any>, FO extends FinderOptions> =
    | (FO['wildcard'] extends true ? { default: InferFilterFunctionReturnType<F> } : InferFilterFunctionReturnType<F>)
    | undefined

/**
 * Lazily finds an export where the given filter returns a truthy value
 * @param filter The filter to match
 * @param opts The options for the finder
 * @returns Lazy exports of the first module which the given filter matches
 */
export function find<F extends FilterFunction<any>, LF extends LazyFinderOptions>(
    filter: F,
    opts?: LF,
): LazyFinderReturn<F, LF> {
    return createLazyModule(filter, opts)
}

/**
 * Asynchronously finds an export where the given filter returns a truthy value
 * @param filter The filter to match
 * @param opts The options for the finder
 * @returns A promise that resolves with the exports of the first module which the given filter matches
 */
export function findAsync<F extends FilterFunction<any>, AF extends AsyncFinderOptions>(
    filter: F,
    opts?: AF,
): Promise<FinderReturn<F, AF>> {
    return new Promise(resolve => {
        const id = setTimeout(() => resolve(undefined), opts?.timeout ?? 3000)
        find(filter, opts)![lazyContextSymbol].exports((exp: Metro.ModuleExports) => {
            clearTimeout(id)
            resolve(exp)
        })
    })
}

/**
 * Eagerly finds an export where the given filter returns a truthy value
 * @param filter
 * @param opts The options for the finder
 * @returns Exports of the first module which the given filter matches
 */
export function findEager<F extends FilterFunction<any>, FF extends FinderOptions>(
    filter: F,
    opts?: FF,
): FinderReturn<F, FF> {
    const [, exports] = findModule(filter, opts)
    return exports
}

/**
 * Lazily yields all exports where filter returns a truthy value.
 * @param filter The filter to match
 * @param opts The options for the finder
 * @yields Lazy exports of all modules which the given filter matches
 */
export function* findAll<F extends FilterFunction<any>, LAF extends AllFinderOptions<LazyFinderOptions>>(
    filter: F,
    opts?: LAF,
): Generator<LazyFinderReturn<F, LAF>, void, unknown> {
    for (const [id] of findAllModules(filter, opts)) yield createLazyModuleById(id, opts)
}

/**
 * Eagerly yields all exports where filter returns a truthy value.
 * @param filter The filter to match
 * @yields Exports of all modules which the given filter matches
 */
export function* findAllEager<F extends FilterFunction<any>>(
    filter: F,
    opts?: AllFinderOptions<FinderOptions>,
): Generator<InferFilterFunctionReturnType<F>, void, unknown> {
    for (const [, exports] of findAllModules(filter, opts)) yield exports
}

/**
 * Finds exports by its module file path
 * @param path The module file path
 * @param options The options for the finder
 * @returns Exports of the module with the given file path
 */
export function findByFilePath<T>(path: string, options?: FinderOptions) {
    const id = cache.moduleFilePaths.get(path)
    if (id === undefined) return
    const exports = requireModule(id)
    if (exports === undefined) return
    return (!options?.wildcard && exports.__esModule ? exports.default : exports) as T
}

/**
 * Finds a property and accesses it lazily, where all specified properties are truthy
 * @param props An array of properties to search for. The first element in the array is the property that will be accessed.
 * @param options The options for the finder
 * @param options.extraProps Additional properties to use for filtering
 * @returns A lazy value of the property with the given property name in exports, where all specified properties are truthy
 */
export function findProp<T>(prop: string, options?: LazyFinderOptions & { extraProps?: string[] }) {
    return lazyValue(
        () => findEager(byProps(prop, ...(options?.extraProps ?? [])), options)?.[prop] as T,
        options?.lazyOptions,
    )
}

/**
 * Finds a property and accesses it lazily, where the specified property is truthy, and the export only has one property
 * @param prop The property to search for
 * @param options The options for the finder
 * @returns A lazy value of the property with the given property name in exports, where the specified property is truthy, and the export only has one property
 */
export function findSingleProp<T>(prop: string, options?: LazyFinderOptions) {
    return lazyValue(() => findEager(bySingleProp(prop), options)?.[prop] as T, options?.lazyOptions)
}
