import { createPatcherInstance } from '@revenge-mod/patcher'
import { createLogger } from '@revenge-mod/utils/library'

export const patcher = createPatcherInstance('revenge.library.modules')
export const logger = createLogger('modules')
