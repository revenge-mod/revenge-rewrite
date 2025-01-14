import { byStoreName } from '@revenge-mod/modules/filters'
import { find } from '../finders'

export const ThemeStore = find(
    byStoreName<{
        theme: string
    }>('ThemeStore'),
)!
