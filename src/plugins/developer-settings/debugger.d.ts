declare global {
    var dbgr: {
        reload(): void
        patcher: {
            // biome-ignore lint/suspicious/noExplicitAny: The object can be anything
            snipe(object: any, key: string, callback?: (args: unknown) => void): void
            // biome-ignore lint/suspicious/noExplicitAny: The object can be anything
            noop(object: any, key: string): void
            wipe(): void
        }
    } | undefined
}

export {}