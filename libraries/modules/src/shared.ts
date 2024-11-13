import { lazyDestructure } from '@revenge-mod/utils/lazy'
import Libraries from '@revenge-mod/utils/library'
import { ModulesLibrary } from '.'

// Re-exports requires double lazyDestructures
export const { patcher, logger } = lazyDestructure(() => Libraries.contextFor(ModulesLibrary))
