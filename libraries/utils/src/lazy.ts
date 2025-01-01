export type ExemptedEntries = Record<symbol | string, unknown>

export interface LazyOptions<E extends ExemptedEntries = ExemptedEntries> {
    hint?: 'function' | 'object'
    exemptedEntries?: E
}

const unconfigurable = new Set(['arguments', 'caller', 'prototype'])
const isUnconfigurable = (key: PropertyKey) => typeof key === 'string' && unconfigurable.has(key)

const factories = new WeakMap<any, () => any>()
const proxyContextHolder = new WeakMap<
    any,
    {
        options: LazyOptions<ExemptedEntries>
        factory: () => any
    }
>()

const lazyHandler: ProxyHandler<any> = {
    ...Object.fromEntries(
        Object.getOwnPropertyNames(Reflect).map(fnName => {
            return [
                fnName,
                (target: any, ...args: any[]) => {
                    const contextHolder = proxyContextHolder.get(target)
                    const resolved = contextHolder?.factory()
                    if (!resolved) throw new Error(`Cannot run Reflect.${fnName} on ${typeof resolved}`)
                    // @ts-expect-error
                    return Reflect[fnName](resolved, ...args)
                },
            ]
        }),
    ),
    has(target, p) {
        const contextHolder = proxyContextHolder.get(target)
        if (contextHolder?.options) {
            const { exemptedEntries: isolatedEntries } = contextHolder.options
            if (isolatedEntries && p in isolatedEntries) return true
        }

        const resolved = contextHolder?.factory()
        if (!resolved) throw new Error(`Cannot read keys of ${typeof resolved} (reading '${String(p)})`)
        return Reflect.has(resolved, p)
    },
    get(target, p, receiver) {
        const contextHolder = proxyContextHolder.get(target)

        if (contextHolder?.options) {
            const { exemptedEntries: isolatedEntries } = contextHolder.options
            if (isolatedEntries?.[p]) return isolatedEntries[p]
        }

        const resolved = contextHolder?.factory()
        if (!resolved) throw new Error(`Cannot read properties of ${typeof resolved} (reading '${String(p)}')`)

        return Reflect.get(resolved, p, receiver)
    },
    ownKeys: target => {
        const contextHolder = proxyContextHolder.get(target)
        const resolved = contextHolder?.factory()
        if (!resolved) throw new Error(`Cannot get keys of ${typeof resolved}`)

        const cacheKeys = Reflect.ownKeys(resolved)
        for (const key of unconfigurable) {
            if (!cacheKeys.includes(key)) cacheKeys.push(key)
        }

        return cacheKeys
    },
    getOwnPropertyDescriptor: (target, p) => {
        const contextHolder = proxyContextHolder.get(target)
        const resolved = contextHolder?.factory()
        if (!resolved) throw new Error(`Cannot get property descriptor of ${typeof resolved} (getting '${String(p)}')`)

        if (isUnconfigurable(p)) return Reflect.getOwnPropertyDescriptor(target, p)

        const descriptor = Reflect.getOwnPropertyDescriptor(resolved, p)
        if (descriptor) Object.defineProperty(target, p, descriptor)
        return descriptor
    },
}

/**
 * Lazy proxy that will only call the factory function when needed (when a property is accessed)
 * @param factory Factory function to create the object
 * @param opts Options for the lazy proxy
 * @param opts.hint Hint for the lazy proxy, if it's an object or a function (default `'function'`)
 * @param opts.exemptedEntries Exempted entries that will be returned directly from the specified values
 * @returns A proxy that will call the factory function only when needed
 * @example const ChannelStore = lazyValue(() => findByProps.eager("getChannelId"));
 */
export function lazyValue<T, I extends ExemptedEntries>(factory: () => T, opts: LazyOptions<I> = {}): T {
    let cache: T

    const HintMap = {
        object: {},
        // biome-ignore lint/complexity/useArrowFunction: When hint is a function, we need to hint it as a function WHICH CAN HAVE A CONSTRUCTOR
        function: function () {},
    } as Record<NonNullable<LazyOptions<any>['hint']>, any>

    const dummy = HintMap[opts.hint ?? 'function']
    const proxyFactory = () => (cache ??= factory())

    const proxy = new Proxy(dummy, lazyHandler) as T & I
    factories.set(proxy, proxyFactory)
    proxyContextHolder.set(dummy, {
        factory,
        options: opts,
    })

    return proxy
}

/**
 * Lazily destructure an object with all the properties being lazified. This assumes all the properties are either an object or a function
 * @param factory Factory function which resolves to the object (and caches it)
 * @param opts Options for the lazy destructure
 * @example
 *
 * const { uuid4 } = lazyDestructure(() => findByProps.eager("uuid4"))
 * uuid4; // <- is a lazy value!
 */
export function lazyDestructure<T extends Record<PropertyKey, unknown>, I extends ExemptedEntries>(
    factory: () => T,
    opts: LazyOptions<I> = {},
): T {
    const proxiedObject = lazyValue(factory)

    return new Proxy(
        {},
        {
            get(_, property) {
                if (property === Symbol.iterator) {
                    return function* () {
                        yield proxiedObject
                        yield new Proxy(
                            {},
                            {
                                get: (_, p) => lazyValue(() => proxiedObject[p], opts),
                            },
                        )
                        throw new Error('This is not a real iterator, this is likely used incorrectly')
                    }
                }
                return lazyValue(() => proxiedObject[property], opts)
            },
        },
    ) as T
}

export function getProxyFactory<T>(obj: T): (() => T) | undefined {
    return factories.get(obj)
}
