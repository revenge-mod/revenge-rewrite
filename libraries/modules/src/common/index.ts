import type { ReactNativeInternals } from '@revenge-mod/revenge'
import type { ComponentType } from 'react'
import { findByFilePath, findByName, findByProps } from '../finders'
import type { DiscordModules } from '../types'

// ! Make sure everything is lazily loaded, otherwise the app will freeze
// ! If lazily loading things break, we'll need to dynamically import after initializeModules

export * as components from './components'

/// DISCORD

export const constants = findByProps.lazy('Fonts') as Record<string, unknown>
export const intlModule = findByProps.lazy('intl') as {
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
export const discordIntl = findByProps.lazy('runtimeHashMessageKey') as typeof import('@discord/intl')
export const tokens = findByProps.lazy('unsafe_rawColors') as {
    themes: Record<string, string>
    colors: Record<string, Record<string, string>>
}

export const Logger = findByName.lazy('Logger') as typeof DiscordModules.Logger

export const legacy_i18n = findByProps.lazy('Messages')
export const legacy_alerts = findByProps.lazy('openLazy', 'close')

export const alerts = findByProps.lazy('openAlert', 'dismissAlert')
export const channels = findByProps.lazy('getVoiceChannelId')
export const links = findByProps.lazy('openDeeplink') as DiscordModules.LinkingUtils
export const clipboard = findByProps.lazy('getImagePNG') as DiscordModules.ClipboardUtils
export const invites = findByProps.lazy('createInvite') as DiscordModules.InviteUtils
export const commands = findByProps.lazy('getBuiltInCommands')
export const toasts = findByFilePath.lazy('modules/toast/native/ToastActionCreators.tsx', true)
export const messages = findByProps.lazy('sendBotMessage') as DiscordModules.MessageUtils

export const NavigationStack = findByProps.lazy('createStackNavigator') as typeof import('@react-navigation/stack')
export const NavigationNative = findByProps.lazy('NavigationContainer') as Omit<
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

export const semver = findByProps.lazy('SEMVER_SPEC_VERSION') as typeof import('semver')

/// FLUX

export const Flux = findByProps.lazy('connectStores')
// TODO: If this fucks up, remove lazy
export const FluxDispatcher = findByProps.lazy('_interceptors') as DiscordModules.Flux.Dispatcher

/// REACT

export const assetsRegistry = findByProps.lazy('registerAsset') as typeof ReactNativeInternals.AssetsRegistry
export const React = (globalThis.React = findByProps.lazy('createElement') as typeof import('react'))
export const ReactNative = (globalThis.ReactNative = findByProps.lazy('AppRegistry') as typeof import('react-native'))

/// OTHERS

export const xxhash64 = findByProps.lazy('XXH64') as typeof import('@intrnl/xxhash64')
export const nobleHashesUtils = findByProps.lazy('randomBytes') as typeof import('@noble/hashes/utils')
export * from 'events'
