// Types that should only exist in Revenge's codebase

declare const __brand: unique symbol

declare global {
    declare type Brand<B> = { [__brand]?: B }
    declare type Branded<T, B> = T & Brand<B>

    var __REVENGE_DEV__: boolean
    var __REVENGE_RELEASE__: string
    var __REVENGE_HASH__: string
    var __REVENGE_HASH_DIRTY__: string

    // TODO: Type this better, or not...
    var __fbBatchedBridge: MessageQueue & {
        flushedQueue(): void
        __callFunction(...args: any[]): void
        callFunctionReturnFlushedQueue(...args: any[]): void
    }
}

export {}
