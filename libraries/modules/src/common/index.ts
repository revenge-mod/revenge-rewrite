import { lazyDestructure } from '@revenge-mod/utils/lazy'
import { findByFilePath, findByName, findByProps } from '../finders'

import type { ReactNativeInternals } from '@revenge-mod/revenge'
import type { ComponentType } from 'react'
import type { DiscordModules } from '../types'

// ! Make sure everything is lazily loaded, otherwise the app will freeze
// ! If lazily loading things break, we'll need to dynamically import after initializeModules

export * as components from './components'
export * as stores from './stores'

/// DISCORD

export const constants = findByProps('Fonts') as Record<string, unknown>
export const tokens = findByProps('internal', 'colors')
export const intl = findByProps('intl') as {
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
}
export const intlModule = findByProps('runtimeHashMessageKey') as typeof import('@discord/intl')

export const Logger = findByName('Logger') as typeof DiscordModules.Logger

export const legacy_i18n = findByProps('Messages')
export const legacy_alerts = findByProps('openLazy', 'close')

export const alerts = findByProps('openAlert', 'dismissAlert')
export const channels = findByProps('getVoiceChannelId')
export const links = findByProps('openDeeplink') as DiscordModules.LinkingUtils
export const clipboard = findByProps('getImagePNG') as DiscordModules.ClipboardUtils
export const invites = findByProps('createInvite') as DiscordModules.InviteUtils
export const commands = findByProps('getBuiltInCommands')
export const toasts = findByFilePath('modules/toast/native/ToastActionCreators.tsx', true)
export const messages = findByProps('sendBotMessage') as DiscordModules.MessageUtils

export const NavigationStack = findByProps('createStackNavigator') as typeof import('@react-navigation/stack')
export const NavigationNative = findByProps('NavigationContainer') as Omit<
    typeof import('@react-navigation/native'),
    'useNavigation'
> & {
    useNavigation: typeof import('@react-navigation/native').useNavigation<
        import('@react-navigation/stack').StackNavigationProp<NavigationNativeStackParamList>
    >
}

export type NavigationNativeStackParamList = {
    RevengeCustomPage: { title: string; render: ComponentType }
    // biome-ignore lint/suspicious/noExplicitAny: https://github.com/react-navigation/react-navigation/issues/9037
    [Page: string]: any
}

export const { TextStyleSheet, createStyles } = lazyDestructure(() =>
    findByProps.eager('TextInput', 'ContextMenu'),
) as {
    createStyles: DiscordModules.Styles.CreateStylesFn
    TextStyleSheet: DiscordModules.Styles.TextStyleSheet
}

/// FLUX

export const Flux = findByProps('connectStores')
// TODO: If this fucks up, remove lazy
export const FluxDispatcher = findByProps('_interceptors') as DiscordModules.Flux.Dispatcher

/// REACT

export const assetsRegistry = findByProps('registerAsset') as typeof ReactNativeInternals.AssetsRegistry
export const React = (globalThis.React = findByProps('createElement') as typeof import('react'))
export const ReactNative = (globalThis.ReactNative = findByProps('AppRegistry') as typeof import('react-native'))

/// OTHERS

export const semver = findByProps('SEMVER_SPEC_VERSION') as typeof import('semver')
export const xxhash64 = findByProps('XXH64') as typeof import('@intrnl/xxhash64')
export const nobleHashesUtils = findByProps('randomBytes') as typeof import('@noble/hashes/utils')
export * from 'events'
