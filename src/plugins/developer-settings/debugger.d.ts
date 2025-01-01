declare global {
    var reload: (() => void) | undefined
    var patcher:
        | {
              snipe(object: any, key: string, callback?: (args: unknown) => void): void
              noop(object: any, key: string): void
              wipe(): void
          }
        | undefined
}

export {}
