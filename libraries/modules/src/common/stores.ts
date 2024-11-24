import { findByStoreName } from '../finders'

export const ThemeStore = findByStoreName<{
    getName(): 'ThemeStore'
    theme: string
}>('ThemeStore')!
