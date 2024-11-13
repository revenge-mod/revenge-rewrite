import type { Filter, FilterPredicate, Metro } from '../types'

export function createFilter<A extends unknown[]>(
    predicate: FilterPredicate<A>,
    keyFor: (args: A) => string,
): Filter<A> {
    const createHolder = <T extends (m: Metro.ModuleExports, id: number, raw: boolean) => ReturnType<typeof predicate>>(
        func: T,
        args: A,
        raw: boolean,
    ) => {
        return Object.assign(func, {
            filter: predicate,
            raw,
            key: `${raw ? 'raw:' : ''}${keyFor(args)}`,
        })
    }

    const curry =
        (raw: boolean) =>
        (...args: A) => {
            return createHolder((m, id, raw) => predicate(args, m, id, raw), args, raw)
        }

    return Object.assign(curry(false), {
        raw: curry(true),
        keyFor,
    })
}

export function createSimpleFilter(predicate: (m: Metro.ModuleExports) => boolean, key: string) {
    return createFilter(
        (_, m) => predicate(m),
        () => `dyn:${key}`,
    )()
}
