// Types that should only exist in Revenge's codebase

declare global {
    /**
     * @internal
     */
    const __BUNDLE_DEV__: boolean
    /**
     * @internal
     */
    const __BUNDLE_RELEASE__: string

    interface Window {
        // TODO: Type this better, or not...
        __fbBatchedBridge: MessageQueue & {
            flushedQueue(): void
            __callFunction(...args: any[]): void
            callFunctionReturnFlushedQueue(...args: any[]): void
        }
    }
}

export {}
