import { type ComponentProps, type FC, type MemoExoticComponent, createContext } from 'react'
import { StyleSheet } from 'react-native'

import type { DiscordModules } from '@revenge-mod/modules'
import type { Storage } from '../../..'

export const styles = StyleSheet.create({
    grow: {
        flexGrow: 1,
    },
    autoSize: {
        flex: 1,
    },
    centerChildren: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingBottom: 12,
    },
    queryContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 8,
    },
    emptyImage: {
        width: '40%',
        height: '20%',
        objectFit: 'contain',
    },
    browserCtaContainer: { marginBottom: 16, marginTop: 32, gap: 16 },
})

export type PluginSettingsPageContextValue = Storage['plugins'] & {
    setQuery: (query: string) => void
    ContextMenuComponent: MemoExoticComponent<
        FC<Pick<ComponentProps<DiscordModules.Components.ContextMenu>, 'children'>>
    >
}

export const PluginSettingsPageContext = createContext<PluginSettingsPageContextValue>(undefined!)
