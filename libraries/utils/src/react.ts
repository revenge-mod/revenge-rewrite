import { useEffect, type ReactNode } from 'react'
import { type SearchFilter, findInTree } from './trees'

export function useIsFirstRender() {
    let firstRender = false
    // biome-ignore lint/correctness/useExhaustiveDependencies: Not needed
    useEffect(() => void (firstRender = true), [])
    return firstRender
}

export function findInReactTree(tree: Extract<ReactNode, { props: unknown }>, filter: SearchFilter): any {
    return findInTree(tree, filter, {
        walkable: ['props', 'children', 'child', 'sibling'],
    })
}
