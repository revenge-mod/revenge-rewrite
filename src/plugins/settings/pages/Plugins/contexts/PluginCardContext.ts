import { createContext } from 'react'

import type { NavigationNative } from '@revenge-mod/modules/common'
import type { InternalPluginDefinition } from '@revenge-mod/plugins/internals'
import type { PluginManifest } from '@revenge-mod/plugins/schemas'

export type PluginCardContext = {
    plugin?: InternalPluginDefinition<any, any, any>
    manifest: PluginManifest
    navigation: ReturnType<typeof NavigationNative.useNavigation>
}

const PluginCardContext = createContext<PluginCardContext>(null!)

export default PluginCardContext