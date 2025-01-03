import type { StackNavigationOptions } from '@react-navigation/stack'
import type { ComponentType } from 'react'

interface SettingsPluginCustomPagesParamList {
    RevengeCustomPage: { render: ComponentType } & StackNavigationOptions
    RevengeAbout: undefined
}

declare module '@revenge-mod/modules/common' {
    interface NavigationNativeStackNavigationParamList extends SettingsPluginCustomPagesParamList {}
}
