export function createBitFlagEnum<K extends string[]>(...flags: K) {
    // @ts-expect-error: Initial setup
    const _enum: KeysToBitFlagEnum<K> = {}
    for (let i = 0; i < flags.length; i++) {
        const flag = flags[i] as keyof typeof _enum
        _enum[flag] = (1 << i) as (typeof _enum)[typeof flag]
    }

    return _enum
}

type KeysToBitFlagEnum<T extends string[]> = {
    [K in T[number]]: K extends T[0]
        ? 1
        : K extends T[1]
          ? 2
          : K extends T[2]
            ? 4
            : K extends T[3]
              ? 8
              : K extends T[4]
                ? 16
                : K extends T[5]
                  ? 32
                  : K extends T[6]
                    ? 64
                    : K extends T[7]
                      ? 128
                      : K extends T[8]
                        ? 256
                        : K extends T[9]
                          ? 512
                          : K extends T[10]
                            ? 1024
                            : K extends T[11]
                              ? 2048
                              : K extends T[12]
                                ? 4096
                                : K extends T[13]
                                  ? 8192
                                  : K extends T[14]
                                    ? 16384
                                    : K extends T[15]
                                      ? 32768
                                      : never
}
