// shims/deps.ts
require('!deps-shim!')

import { lazyDestructure } from '@revenge-mod/utils/lazy'
import { findByFilePath, findByName, findByProps } from '../finders'

import type { StackNavigationOptions } from '@react-navigation/stack'
import type { ReactNativeInternals } from '@revenge-mod/revenge'
import type { ComponentType } from 'react'
import type { DiscordModules } from '../types'

export * as components from './components'
export * as stores from './stores'

/// DISCORD

export const constants = findByProps<Record<string, unknown>>('Fonts')!
export const tokens = findByProps('internal', 'colors')!
export const intl = findByProps<{
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
}>('intl')!
export const intlModule = findByProps<typeof import('@discord/intl')>('runtimeHashMessageKey')!

export const Logger = findByName('Logger') as unknown as typeof DiscordModules.Logger

export const legacy_alerts = findByProps('openLazy', 'close')!

export const alerts = findByProps('openAlert', 'dismissAlert')!
export const channels = findByProps('getVoiceChannelId')!
export const links = findByProps<DiscordModules.LinkingUtils>('openURL', 'openDeeplink')!
export const clipboard = findByProps<DiscordModules.ClipboardUtils>('getImagePNG')!
export const invites = findByProps<DiscordModules.InviteUtils>('createInvite')!
export const commands = findByProps('getBuiltInCommands')!
export const toasts = findByFilePath<DiscordModules.ToastActionCreators, true>(
    'modules/toast/native/ToastActionCreators.tsx',
    true,
)!
export const filePicker = findByProps<DiscordModules.FilePickerUtils>('handleDocumentSelection')!
export const messages = findByProps<DiscordModules.MessageUtils>('sendBotMessage')!

export const NavigationStack = findByProps<typeof import('@react-navigation/stack')>('createStackNavigator')!
export const NavigationNative = findByProps<
    Omit<typeof import('@react-navigation/native'), 'useNavigation'> & {
        useNavigation: typeof import('@react-navigation/native').useNavigation<
            import('@react-navigation/stack').StackNavigationProp<NavigationNativeStackParamList>
        >
    }
>('NavigationContainer')!

export type NavigationNativeStackParamList = {
    RevengeCustomPage: { render: ComponentType } & StackNavigationOptions
    // biome-ignore lint/suspicious/noExplicitAny: https://github.com/react-navigation/react-navigation/issues/9037
    [Page: string]: any
}

export const { TextStyleSheet, createStyles, dismissAlerts, openAlert } = lazyDestructure(
    () =>
        findByProps.eager<{
            createStyles: DiscordModules.Styles.CreateStylesFn
            TextStyleSheet: DiscordModules.Styles.TextStyleSheet
            dismissAlerts: DiscordModules.Alerts['dismissAlerts']
            openAlert: DiscordModules.Alerts['openAlert']
        }>('createStyles', 'TextStyleSheet')!,
)

/// FLUX

export const Flux = findByProps('connectStores')
export const FluxDispatcher = findByProps<DiscordModules.Flux.Dispatcher>('_interceptors')

/// REACT

export const assetsRegistry = findByProps<typeof ReactNativeInternals.AssetsRegistry>('registerAsset')!
// Declarations are made in shims/deps.ts
export const { React, ReactNative } = lazyDestructure(() => globalThis)
export const ReactJSXRuntime = findByProps<typeof import('react/jsx-runtime')>('jsx', 'jsxs')!

/// OTHERS

export const semver = findByProps<typeof import('semver')>('SEMVER_SPEC_VERSION')!
export const xxhash64 = findByProps<typeof import('@intrnl/xxhash64')>('XXH64')!
export const nobleHashesUtils = findByProps<typeof import('@noble/hashes/utils')>('randomBytes')!
export * from 'events'

export const _ = findByProps<typeof import('lodash')>('cloneDeep')!
