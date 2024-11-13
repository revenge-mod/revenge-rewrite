export type SearchTree = Record<string, any>
export type SearchFilter = (tree: SearchTree) => boolean

export interface FindInTreeOptions {
    walkable?: string[]
    ignore?: string[]
    maxDepth?: number
}

function treeSearch(
    tree: SearchTree,
    filter: SearchFilter,
    opts: Required<FindInTreeOptions>,
    depth: number,
): any | undefined {
    if (depth > opts.maxDepth || !tree) return

    // Check if the current tree node matches the filter
    if (filter(tree)) return tree

    // Determine if the current node is an array or an object
    const isArray = Array.isArray(tree)
    const keys = isArray ? tree : Object.keys(tree)

    for (const key of keys) {
        const item = isArray ? key : tree[key]

        if (typeof item !== 'object' || item === null) continue

        // Check walkable and ignore conditions
        if (!isArray && opts.walkable.length && !opts.walkable.includes(key)) continue
        if (!isArray && opts.ignore.includes(key)) continue

        // Recursively search in the child node
        const found = treeSearch(item, filter, opts, depth + 1)
        if (found) return found
    }
}

export function findInTree(
    tree: SearchTree,
    filter: SearchFilter,
    { walkable = [], ignore = [], maxDepth = 100 }: FindInTreeOptions = {},
): any | undefined {
    return treeSearch(tree, filter, { walkable, ignore, maxDepth }, 0)
}
