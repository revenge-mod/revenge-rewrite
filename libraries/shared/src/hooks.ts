import { useReducer } from 'react'

export function useRerenderer() {
    const [, forceUpdate] = useReducer(x => ~x, 0)
    return forceUpdate
}