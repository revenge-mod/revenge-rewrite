import { tokens } from '@revenge-mod/modules/common'
import { lazyValue } from '@revenge-mod/utils/lazy'
import { ThemeStore } from 'libraries/modules/src/common/stores'

export const SemanticColor = lazyValue(() => tokens.colors)
export const RawColor = lazyValue(() => tokens.unsafe_rawColors)

export function isSemanticColor(key: string): boolean {
    return tokens.internal.isSemanticColor(key)
}

export function resolveSemanticColor(key: string, theme = ThemeStore.theme): string {
    return tokens.internal.resolveSemanticColor(theme, key)
}
