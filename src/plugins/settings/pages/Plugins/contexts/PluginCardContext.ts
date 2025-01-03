/// <reference path="../../../screens.d.ts" />

import { createContext } from 'react'

import type { NavigationNative } from '@revenge-mod/modules/common'
import type { InternalPluginDefinition } from '@revenge-mod/plugins/internals'
import type { PluginManifest } from '@revenge-mod/plugins/schemas'

import type { StackNavigationProp as _SNP } from '@react-navigation/stack'

export type PluginCardContext = {
    plugin?: InternalPluginDefinition<any, any, any>
    manifest: PluginManifest
    navigation: ReturnType<typeof NavigationNative.useNavigation<StackNavigationProp>>
}

export type StackNavigationProp = _SNP<ReactNavigation.RootParamList>

const PluginCardContext = createContext<PluginCardContext>(null!)

export default PluginCardContext