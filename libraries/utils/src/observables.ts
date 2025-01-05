import { Observable, type Observer, type ObserverOptions } from '@gullerya/object-observer'
import { useRerenderer } from '@revenge-mod/utils/hooks'

export function useObserve(observables: Observable[], opts?: ObserverOptions) {
    const rerender = useRerenderer()

    // biome-ignore lint/correctness/useExhaustiveDependencies: We manually re-render when needed
    React.useEffect(() => {
        for (const o of observables) Observable.observe(o, rerender, opts)

        return () => {
            for (const o of observables) Observable.unobserve(o, rerender)
        }
    }, [])
}

export function useObserveFiltered(
    observable: Observable,
    filter: (...args: Parameters<Observer>) => boolean,
    opts?: ObserverOptions,
) {
    const rerender = useRerenderer()

    // biome-ignore lint/correctness/useExhaustiveDependencies: We manually re-render when needed
    React.useEffect(() => {
        const listener: Observer = changes => filter(changes) && rerender()
        Observable.observe(observable, listener, opts)

        return () => Observable.unobserve(observable, listener)
    }, [])
}
