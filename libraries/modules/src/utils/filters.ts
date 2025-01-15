import type { FilterObject, FilterFunction, FilterPredicate, Metro } from '../types'

export function createFilter<A extends unknown[]>(
    predicate: FilterPredicate<A>,
    keyFor: (args: A) => string,
): FilterObject<A> {
    return Object.assign(
        (...args: A) =>
            Object.assign(
                ((m, id) => predicate(args, m, id)) satisfies (
                    m: Metro.ModuleExports,
                    id: number,
                ) => ReturnType<typeof predicate>,
                {
                    filter: predicate,
                    key: keyFor(args),
                },
            ) satisfies FilterFunction<A>,
        {
            keyFor,
        },
    )
}

export function createSimpleFilter(predicate: (m: Metro.ModuleExports) => boolean, key: string) {
    return createFilter(
        (_, m) => predicate(m),
        () => `dyn:${key}`,
    )()
}
