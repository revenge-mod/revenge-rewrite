import { createFilter } from './utils/filters'

export * from './utils/filters'

import type { FilterFunction } from '@revenge-mod/modules'
import type { AnyObject } from '@revenge-mod/shared/types'

type Filter<F> = F extends (...args: infer A) => FilterFunction<any>
    ? F & {
          keyFor(args: A): string
      }
    : never

type ByPropsArgs<T extends AnyObject = AnyObject> = [prop: keyof T, ...props: Array<keyof T | (string & {})>]
type ByProps = Filter<<T extends AnyObject>(...args: ByPropsArgs<T>) => FilterFunction<ByPropsArgs<T>, T>>

/**
 * Filters exports where specified properties are truthy
 *
 * `m[prop] && props.every(p => m[p])`
 *
 * @param prop The property to search for
 * @param props Additional properties to search for
 */
export const byProps = createFilter<ByPropsArgs>(
    (props, m) => (props.length === 1 ? m[props[0]] : props.every(p => m[p])),
    props => `revenge.props(${props.join(',')})`,
) as ByProps

type ByNameArgs<T extends AnyObject> = [name: NameOf<T>]
type NameOf<T extends AnyObject> = T['name'] extends string ? T['name'] : string
type ByName = Filter<
    <T extends AnyObject>(...args: ByNameArgs<T>) => FilterFunction<ByNameArgs<T>, T & { name: NameOf<T> }>
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

type ByDisplayNameArgs<T extends AnyObject> = [displayName: DisplayNameOf<T>]
type DisplayNameOf<T extends AnyObject> = T['displayName'] extends string ? T['displayName'] : string
type ByDisplayName = Filter<
    <T extends AnyObject>(
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

type ByTypeNameArgs<T extends AnyObject> = [typeName: TypeNameOf<T>]
type TypeNameOf<T extends AnyObject> = T['type']['name'] extends string ? T['type']['name'] : string
type ByTypeName = Filter<
    <T extends AnyObject>(
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

type ByStoreNameArgs<T extends AnyObject> = [storeName: StoreNameOf<T>]
type StoreNameOf<T extends AnyObject> = T['getName'] extends () => infer U ? U : string
type ByStoreName = Filter<
    <T extends AnyObject>(
        ...args: ByStoreNameArgs<T>
    ) => FilterFunction<ByStoreNameArgs<T>, T & { getName: () => StoreNameOf<T> }>
>

/**
 * Filters for exports with matching store names.
 *
 * `m.getName.length === 0 && m.getName() === name`
 *
 * @param name The store name to search for
 */
export const byStoreName = createFilter<Parameters<ByStoreName>>(
    ([name], m) => m.getName?.length === 0 && m.getName() === name,
    ([name]) => `revenge.storeName(${name})`,
) as ByStoreName

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
