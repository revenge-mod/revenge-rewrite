import { AppLibrary } from '@revenge-mod/app'
import { lazyValue } from '@revenge-mod/utils/lazy'
import Libraries from '@revenge-mod/utils/library'

export const app = lazyValue(() => Libraries.instanceFor(AppLibrary))
