// Types that should only exist in Revenge's codebase

declare global {
    /**
     * @internal
     */
    var __BUNDLE_DEV__: boolean
    /**
     * @internal
     */
    var __BUNDLE_RELEASE__: string

    // TODO: Type this better, or not...
    var __fbBatchedBridge: MessageQueue & {
        flushedQueue(): void
        __callFunction(...args: any[]): void
        callFunctionReturnFlushedQueue(...args: any[]): void
    }
}

export {}
