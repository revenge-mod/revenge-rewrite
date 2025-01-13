import { cache } from './metro/caches'
import { createFilter } from './utils/filters'

export * from './utils/filters'

import type { FilterFunction } from '@revenge-mod/modules'

type Filter<F> = F extends (...args: infer A) => FilterFunction<any>
    ? F & {
          keyFor(args: A): string
      }
    : never

type ByPropsArgs<T extends Record<string, any> = Record<string, any>> = [
    prop: keyof T,
    ...props: Array<keyof T | (string & {})>,
]
type ByProps = Filter<<T extends Record<string, any>>(...args: ByPropsArgs<T>) => FilterFunction<ByPropsArgs<T>, T>>

/**
 * Filters exports where specified properties are truthy
 *
 * `m[prop] && props.every(p => m[p])`
 *
 * @param prop The property to search for
 * @param props Additional properties to search for
 */
export const byProps = createFilter<ByPropsArgs>(
    (props, m) => props.length === 1 ? m[props[0]] : props.every(p => m[p]),
    props => `revenge.props(${props.join(',')})`,
) as ByProps

type ByMutablePropsArgs<T extends Record<string, any> = Record<string, any>> = [prop: keyof T]
type ByMutableProp = Filter<
    <T extends Record<string, any>>(...args: ByMutablePropsArgs<T>) => FilterFunction<ByMutablePropsArgs<T>, T>
>

/**
 * Filters for exports which has the given mutable property
 */
export const byMutableProp = createFilter<ByMutablePropsArgs>(
    ([prop], m) => m?.[prop] && !Object.getOwnPropertyDescriptor(m, prop)?.get,
    ([prop]) => `revenge.mutableProp(${prop})`,
) as ByMutableProp

type ByNameArgs<T extends { name?: string }> = [name: NameOf<T>]
type NameOf<T extends { name?: string }> = T['name'] extends undefined ? string : T['name']
type ByName = Filter<
    <T extends { name?: string }>(...args: ByNameArgs<T>) => FilterFunction<ByNameArgs<T>, T & { name: NameOf<T> }>
>

/**
 * Filters for exports with matching names. Some functions and React components have a `name` property.
 *
 * `m.name === name`
 *
 * @param name The name to search for
 */
export const byName = createFilter<Parameters<ByName>>(
    ([name], m) => m.name === name,
    ([name]) => `revenge.name(${name})`,
) as ByName

type ByDisplayNameArgs<T extends { displayName?: string }> = [displayName: DisplayNameOf<T>]
type DisplayNameOf<T extends { displayName?: string }> = T['displayName'] extends undefined ? string : T['displayName']
type ByDisplayName = Filter<
    <T extends { displayName?: string }>(
        ...args: ByDisplayNameArgs<T>
    ) => FilterFunction<ByDisplayNameArgs<T>, T & { displayName: DisplayNameOf<T> }>
>

/**
 * Filters for exports with matching display names. Some React components have a `displayName` property.
 *
 * `m.displayName === name`
 *
 * @param name The display name to search for
 */
export const byDisplayName = createFilter<Parameters<ByDisplayName>>(
    ([displayName], m) => m.displayName === displayName,
    ([displayName]) => `revenge.displayName(${displayName})`,
) as ByDisplayName

type ByTypeNameArgs<T extends { type?: { name?: string } }> = [typeName: TypeNameOf<T>]
type TypeNameOf<T extends { type?: { name?: string } }> = T['type'] extends { name?: string }
    ? T['type']['name']
    : string
type ByTypeName = Filter<
    <T extends { type?: { name?: string } }>(
        ...args: ByTypeNameArgs<T>
    ) => FilterFunction<ByTypeNameArgs<T>, T & { type: { name: TypeNameOf<T> } }>
>

/**
 * Filters for exports with matching type names. React's component tree/fiber has these properties.
 *
 * `m.type.name === name`
 *
 * @param name The type name to search for
 */
export const byTypeName = createFilter<Parameters<ByTypeName>>(
    ([typeName], m) => m.type?.name === typeName,
    ([typeName]) => `revenge.typeName(${typeName})`,
) as ByTypeName

type ByStoreNameArgs<T extends { getName?: () => string }> = [storeName: StoreNameOf<T>]
type StoreNameOf<T extends { getName?: () => string }> = T['getName'] extends () => infer U ? U : string
type ByStoreName = Filter<
    <T extends { getName?: () => string }>(
        ...args: ByStoreNameArgs<T>
    ) => FilterFunction<ByStoreNameArgs<T>, T & { getName: () => StoreNameOf<T> }>
>

/**
 * Filters for exports with matching store names.
 *
 * `m.getName?.length === 0 && m.getName() === name`
 *
 * @param name The store name to search for
 */
export const byStoreName = createFilter<Parameters<ByStoreName>>(
    ([name], m) => m.getName?.length === 0 && m.getName() === name,
    ([name]) => `revenge.storeName(${name})`,
) as ByStoreName

type ByFilePath = Filter<<T>(path: string) => FilterFunction<[path: string], T>>

/**
 * Filters for exports with matching imported file path. Useful for finding modules whose properties are not unique.
 *
 * @param path The file path to search for
 */
export const byFilePath = createFilter<Parameters<ByFilePath>>(
    ([path], _, id) => {
        return cache.moduleFilePaths.get(id) === path
    },
    ([path]) => `revenge.filePath(${path})`,
) as ByFilePath

type BySinglePropArgs<T extends Record<string, any>> = [prop: keyof T]
type BySingleProp = Filter<
    <T extends Record<string, any>>(...args: BySinglePropArgs<T>) => FilterFunction<BySinglePropArgs<T>, T>
>

/**
 * Filters for exports with a single property matching the property name
 *
 * `m[prop] && Object.keys(m).length === 1`
 *
 * @param name The property to search for
 */
export const bySingleProp = createFilter<Parameters<BySingleProp>>(
    ([prop], m) => m[prop] && Object.keys(m).length === 1,
    prop => `revenge.singleProp(${prop})`,
) as BySingleProp
