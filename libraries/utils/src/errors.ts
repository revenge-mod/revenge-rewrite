export function getErrorStack(e: unknown) {
    return (e as Error)?.stack || String(e)
}
