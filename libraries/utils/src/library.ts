export function createLogger(name: string) {
    const tag = `[revenge.${name}]`

    return {
        log: (message: string) => console.log(`${tag} ${message}`),
        warn: (message: string) => console.warn(`${tag} ${message}`),
        error: (message: string) => console.error(`${tag} ${message}`),
    } satisfies LibraryLogger
}

export interface LibraryLogger {
    log(...args: unknown[]): void
    warn(...args: unknown[]): void
    error(...args: unknown[]): void
}
