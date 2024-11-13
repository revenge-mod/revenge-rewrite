import { type SearchFilter, findInTree } from './trees'

export function useIsFirstRender() {
    let firstRender = false
    // biome-ignore lint/correctness/useExhaustiveDependencies: Not needed
    React.useEffect(() => void (firstRender = true), [])
    return firstRender
}

export function findInReactTree(tree: { [key: string]: any }, filter: SearchFilter): any {
    return findInTree(tree, filter, {
        walkable: ['props', 'children', 'child', 'sibling'],
    })
}
