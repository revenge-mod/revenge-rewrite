import { lazyDestructure, lazyValue } from '@revenge-mod/utils/lazy'

import React from 'react'
import ReactNative from 'react-native'

import type { ReactNativeInternals } from '@revenge-mod/revenge'
import type { DiscordModules } from '../types'

import { byFilePath, byName, byProps } from '@revenge-mod/modules/filters'
import { find, findEager, findSingleProp } from '../finders'

export * as components from './components'
export * as stores from './stores'

/// DISCORD

export const constants = find(byProps<Record<string, unknown>>('Fonts'))!
export const tokens = find(byProps('internal', 'colors'))!
export const intl = find(
    byProps<{
        intl: import('@discord/intl').IntlManager & {
            format: typeof import('@discord/intl').astFormatter['format']
            formatToPlainString: typeof import('@discord/intl').stringFormatter['format']
            formatToMarkdownString: typeof import('@discord/intl').markdownFormatter['format']
            formatToParts: typeof import('@discord/intl').reactFormatter['format']
        }
        t: Record<
            string,
            (() => {
                locale: string
                /**
                 * Keyless AST structure
                 * @see Android's `base.apk/res/raw/intl_messages_*.jsona`
                 * @see {@link https://github.com/discord/discord-intl/blob/main/packages/intl-ast/index.ts}
                 */
                ast: string | import('@discord/intl-ast').AstNode[]
                reserialize(): string
            }) & {
                __phantom: unknown
            }
        >
    }>('intl'),
)!
export const intlModule = find(byProps<typeof import('@discord/intl')>('runtimeHashMessageKey'))!

export const Logger = find(byName<typeof DiscordModules.Logger>('Logger'))!

export const actionSheets = find(byProps<DiscordModules.ActionSheets>('hideActionSheet'))!
export const alerts = find(byProps<DiscordModules.Alerts>('openAlert', 'dismissAlert'))!
export const channels = find(byProps('getVoiceChannelId'))!
export const links = find(byProps<DiscordModules.LinkingUtils>('openURL', 'openDeeplink'))!
export const clipboard = find(byProps<DiscordModules.ClipboardUtils>('getImagePNG'))!
export const invites = find(byProps<DiscordModules.InviteUtils>('createInvite'))!
export const commands = find(byProps('getBuiltInCommands'))!
export const toasts = find(
    byFilePath<DiscordModules.ToastActionCreators>('modules/toast/native/ToastActionCreators.tsx'),
)!
export const filePicker = find(byProps<DiscordModules.FilePickerUtils>('handleDocumentSelection'))!
export const messages = find(byProps<DiscordModules.MessageUtils>('sendBotMessage'))!

export const NavigationStack = find(byProps<typeof import('@react-navigation/stack')>('createStackNavigator'))!
export const NavigationNative = find(byProps<typeof import('@react-navigation/native')>('NavigationContainer'))!

export interface NavigationNativeStackNavigationParamList {
    [Page: string]: any
}

export const { TextStyleSheet, createStyles, dismissAlerts, openAlert } = lazyDestructure(
    () =>
        findEager(
            byProps<{
                createStyles: DiscordModules.Styles.CreateStylesFn
                TextStyleSheet: DiscordModules.Styles.TextStyleSheet
                dismissAlerts: DiscordModules.Alerts['dismissAlerts']
                openAlert: DiscordModules.Alerts['openAlert']
            }>('createStyles', 'TextStyleSheet'),
        )!,
)

export const showSimpleActionSheet =
    findSingleProp<typeof DiscordModules.ActionSheets.showSimpleActionSheet>('showSimpleActionSheet')!

/// FLUX

export const Flux = find(byProps('connectStores'))
export const FluxDispatcher = find(byProps<DiscordModules.Flux.Dispatcher>('_interceptors'))

/// REACT

export const assetsRegistry = find(byProps<typeof ReactNativeInternals.AssetsRegistry>('registerAsset'))!

// Declarations are made in shims/deps.ts
export { React, ReactNative }
export const ReactJSXRuntime = find(byProps<typeof import('react/jsx-runtime')>('jsx', 'jsxs'))!

/// OTHERS

export const semver = find(byProps<typeof import('semver')>('SEMVER_SPEC_VERSION'))!
export const xxhash64 = find(byProps<typeof import('@intrnl/xxhash64')>('XXH64'))!
export const nobleHashesUtils = find(byProps<typeof import('@noble/hashes/utils')>('randomBytes'))!
export * from 'events'

export const _ = lazyValue(() => require('lodash')) as typeof import('lodash')
