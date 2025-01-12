import { cache } from './metro/caches'
import { createFilter } from './utils/filters'

export * from './utils/filters'

/**
 * Filters for exports which has given properties
 */
export const byProps = createFilter<string[]>(
    (props, m) => (props.length === 0 ? m[props[0]] : props.every(p => m[p])),
    props => `revenge.props(${props.join(',')})`,
)

/**
 * Filters for exports which has the given mutable property
 */
export const byMutableProp = createFilter<[prop: string]>(
    ([prop], m) => m?.[prop] && !Object.getOwnPropertyDescriptor(m, prop)?.get,
    prop => `revenge.mutableProp(${prop})`,
)

/**
 * Filters for exports whose `name` property matches the given name
 */
export const byName = createFilter<[name: string]>(
    ([name], m) => m.name === name,
    name => `revenge.name(${name})`,
)

/**
 * Filters for exports whose `displayName` property matches the given name
 */
export const byDisplayName = createFilter<[displayName: string]>(
    ([displayName], m) => m.displayName === displayName,
    name => `revenge.displayName(${name})`,
)

/**
 * Filters for exports whose `type.name` property matches the given name
 */
export const byTypeName = createFilter<[typeName: string]>(
    ([typeName], m) => m.type?.name === typeName,
    name => `revenge.typeName(${name})`,
)

/**
 * Filters for store exports which has a given store name
 */
export const byStoreName = createFilter<[storeName: string]>(
    ([name], m) => m.getName?.length === 0 && m.getName() === name,
    name => `revenge.storeName(${name})`,
)

/**
 * Filters for exports whose file path matches the given path
 */
export const byFilePath = createFilter<[path: string, returnDefaultExport: boolean]>(
    ([path, returnDefaultExport], _, id, isDefaultExport) => {
        return returnDefaultExport === isDefaultExport && cache.moduleFilePaths.get(id) === path
    },
    ([path, returnDefaultExport]) => `revenge.filePath(${path},${returnDefaultExport})`,
)

/**
 * Filters for exports with only has the given property
 */
export const bySingleProp = createFilter<[prop: string]>(
    ([prop], m) => m[prop] && Object.keys(m).length === 1,
    prop => `revenge.singleProp(${prop})`,
)

/**
 * Filters for exports which matches the given query (very expensive, should only use in development)
 */
export const byQuery = createFilter<[query: string, caseSensitive: boolean]>(
    ([query, caseSensitive], m) => {
        const applyStringTransformation = (str: string) => (caseSensitive ? str : str.toLowerCase())
        const transformedQuery = applyStringTransformation(query)

        try {
            return (
                m.name?.toLowerCase()?.includes(transformedQuery) ||
                m.displayName?.toLowerCase()?.includes(transformedQuery) ||
                m.type?.name?.toLowerCase()?.includes(transformedQuery) ||
                (m.getName?.length === 0 && m.getName?.()?.toLowerCase()?.includes(transformedQuery)) ||
                cache.moduleFilePaths.get(m.id)?.toLowerCase()?.includes(transformedQuery) ||
                Object.keys(m).some(k => k.toLowerCase().includes(transformedQuery)) ||
                Object.values(m).some(v => String(v).toLowerCase().includes(transformedQuery))
            )
        } catch {
            // You can't access some properties of some objects (proxy error), so just return false
            return false
        }
    },
    ([query, caseSensitive]) => `revenge.query(${caseSensitive ? query : query.toLowerCase()})`,
)
