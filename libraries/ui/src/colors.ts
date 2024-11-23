import { tokens } from '@revenge-mod/modules/common'
import { ThemeStore } from '@revenge-mod/modules/common/stores'
import { lazyValue } from '@revenge-mod/utils/lazy'

export const SemanticColor = lazyValue(() => tokens.colors) as Record<string, symbol & { __TYPE__: 'Color' }>
export const RawColor = lazyValue(() => tokens.unsafe_rawColors) as Record<string, string>

export function isSemanticColor(key: string): boolean {
    return tokens.internal.isSemanticColor(key)
}

export function resolveSemanticColor(key: string, theme = ThemeStore.theme): string {
    return tokens.internal.resolveSemanticColor(theme, key)
}
