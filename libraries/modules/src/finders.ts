import { isModuleExportsBad, moduleIdsForFilter, requireModule } from './metro'
import { cacherFor } from './metro/caches'
import { createLazyModule, createLazyModuleById, lazyContextSymbol } from './utils/lazy'

import { lazyValue, type LazyOptions } from '@revenge-mod/utils/lazy'
import type { FilterFunction, InferFilterFunctionReturnType, LazyModule, Metro } from './types'
import { byProps, bySingleProp } from '@revenge-mod/modules/filters'

function filterExports<F extends FilterFunction<any>>(
    moduleExports: Metro.ModuleExports,
    moduleId: number,
    filter: F,
    opts?: FinderOptions,
): [] | [exports: Metro.ModuleExports, pass: boolean] {
    if (!opts?.skipDefaultExportCheck && moduleExports.__esModule) {
        const defaultExport = moduleExports.default
        if ((defaultExport || typeof defaultExport === 'number') && filter(defaultExport, moduleId))
            return [opts?.returnWholeModule ? moduleExports : defaultExport, true]
    }

    if (filter(moduleExports, moduleId)) return [moduleExports, true]

    return []
}

/**
 * Finds the first module where the given filter returns a truthy value
 * @param filter The filter to match
 * @returns An object containing the module ID and exports of the first module which the given filter matches
 */
export function findModule<F extends FilterFunction<any>>(
    filter: F,
    opts?: FinderOptions,
): [Metro.ModuleID, Metro.ModuleExports] | [] {
    const { cache, finish } = cacherFor(filter.key, !!opts?.returnWholeModule)

    for (const id of moduleIdsForFilter(filter.key, false)) {
        const fullExports = requireModule(id)
        if (isModuleExportsBad(fullExports)) continue

        const [exports, pass] = filterExports(fullExports, id, filter, opts)
        if (pass) {
            const cached = cache(id, exports)
            if (!cached) continue

            finish(false)
            return [id, exports]
        }
    }

    finish(true)
    return []
}

/**
 * Yields all modules where filter returns a truthy value.
 * @param filter The filter to match
 * @returns A generator that yields an array containing the module ID and whether the export is the default export
 */
export function* findAllModules<F extends FilterFunction<any>>(
    filter: F,
    opts?: FinderOptions,
): Generator<[Metro.ModuleID, InferFilterFunctionReturnType<F>], void, unknown> {
    const { cache, finish } = cacherFor(filter.key, !!opts?.returnWholeModule)

    let found = false

    for (const id of moduleIdsForFilter(filter.key, true)) {
        const fullExports = requireModule(id)
        if (isModuleExportsBad(fullExports)) continue

        const [exports, pass] = filterExports(fullExports, id, filter, opts)
        if (pass) {
            const cached = cache(id, exports)
            if (!cached) continue
            found = true
            yield [id, exports]
        }
    }

    finish(found, true)
}

export type FinderOptions = {
    /**
     * Whether to return the whole module instead of just the default export
     * @default false
     */
    returnWholeModule?: boolean
    /**
     * Whether the finder should skip filtering the default export. The default export check is always prioritized over the whole module check.
     * @default false
     */
    skipDefaultExportCheck?: boolean
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

export type LazyFinderReturn<F extends FilterFunction<any>, LF extends LazyFinderOptions> = LazyModule<
    FinderReturn<F, LF>
>
// TODO: Type this properly
//    & NonNullable<NonNullable<LF['lazyOptions']>['exemptedEntries']>

export type FinderReturn<F extends FilterFunction<any>, FO extends FinderOptions> =
    | (FO['returnWholeModule'] extends true
          ? { default: InferFilterFunctionReturnType<F> }
          : InferFilterFunctionReturnType<F>)
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
export function* findAll<F extends FilterFunction<any>, LF extends LazyFinderOptions>(
    filter: F,
    opts?: LF,
): Generator<LazyFinderReturn<F, LF>, void, unknown> {
    for (const [id] of findAllModules(filter, opts)) yield createLazyModuleById(id, opts)
}

/**
 * Eagerly yields all exports where filter returns a truthy value.
 * @param filter The filter to match
 * @yields Exports of all modules which the given filter matches
 */
export function* findAllEager<F extends FilterFunction<any>>(
    filter: F,
): Generator<InferFilterFunctionReturnType<F>, void, unknown> {
    for (const [, exports] of findAllModules(filter)) yield exports
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
