// @ts-expect-error
globalThis.window = globalThis

require('@revenge-mod/modules/metro').restoreCache()
require('./index')
