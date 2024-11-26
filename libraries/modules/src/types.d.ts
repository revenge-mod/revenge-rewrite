import type { If, Nullish } from '@revenge-mod/shared/types'
import type React from 'react'

import type { ReactNode } from 'react'
import type {
    ImageProps,
    ImageSourcePropType,
    ImageStyle,
    PressableProps,
    TextInputProps,
    TextProps,
    TextStyle,
    ViewProps,
    ViewStyle,
} from 'react-native'
import type { MetroModuleFilePathKey } from './constants'
import type { lazyContextSymbol } from './utils/lazy'

/// METRO

/** @see {@link https://github.com/facebook/metro/blob/c2d7539dfc10aacb2f99fcc2f268a3b53e867a90/packages/metro-runtime/src/polyfills/require.js} */
export namespace Metro {
    export type DependencyMap = Array<ModuleID> & {
        readonly paths?: Readonly<Record<ModuleID, string>> | undefined
    }

    export type FactoryFn = (
        global: object,
        require: RequireFn,
        metroImportDefault: RequireFn,
        metroImportAll: RequireFn,
        moduleObject: {
            exports: ModuleExports
        },
        exports: ModuleExports,
        dependencyMap: DependencyMap | Nullish,
    ) => void

    export type ModuleID = number

    export type ModuleIDKey = ModuleID | string

    export interface ModuleDefinition<Initialized = boolean> {
        /** Set to undefined once module is initialized */
        dependencyMap: If<Initialized, undefined, DependencyMap>
        /** Error value thrown by the factory */
        // biome-ignore lint/suspicious/noExplicitAny: This is okay
        error?: any
        /** Set to undefined once module is initialized */
        factory: If<Initialized, undefined, FactoryFn>
        /**
         * If factory has thrown any error
         * */
        hasError: boolean
        /**
         * Cached `import *` imports in Metro, always an empty object as we prevent outdated import cache
         * */
        importedAll: ModuleExports
        /**
         * Cached `import module from "./module"` imports in Metro, always an empty object as we prevent outdated import cache
         * */
        importedDefault: ModuleExports
        /**
         * Whether factory has been successfully called
         * */
        isInitialized: boolean
        /**
         * Acts as CJS module in the bundler
         * */
        publicModule: Module

        /**
         * This is set by us. Should be available for all Discord's tsx modules!
         */
        [MetroModuleFilePathKey]?: string
    }

    export type ModuleList = Record<ModuleID, ModuleDefinition | Nullish>

    export type RequireFn = (id: ModuleID) => ModuleExports

    export type DefineFn = (factory: FactoryFn, moduleId: ModuleID, dependencyMap?: DependencyMap | undefined) => void

    export type ModuleDefiner = (moduleId: ModuleID) => void

    export type ClearFn = () => ModuleList

    export type RegisterSegmentFn = (
        segmentId: number,
        moduleDefiner: ModuleDefiner,
        moduleIds: Readonly<ModuleID[]> | Nullish,
    ) => void

    export interface Require extends RequireFn {
        importDefault: RequireFn
        importAll: RequireFn
        /** @throws {Error} A macro, will always throws an error at runtime */
        context: () => never
        /** @throws {Error} A macro, will always throws an error at runtime */
        resolveWeak: () => never
        unpackModuleId: (moduleId: ModuleID) => {
            localId: number
            segmentId: number
        }
        packModuleId: (value: {
            localId: number
            segmentId: number
        }) => ModuleID
    }

    // biome-ignore lint/suspicious/noExplicitAny: This is okay
    export type ModuleExports = any
}

/// FILTERS

export type FilterPredicate<A extends unknown[]> = (
    /**
     * Arguments passed to the filter
     */
    args: A,
    /**
     * The module exports to check
     */
    moduleExports: ModuleExports,
    /**
     * The ID of the module
     */
    moduleId: Metro.ModuleID,
    /**
     * Whether the returned value should be unmodified
     */
    raw: boolean,
) => boolean

export interface FilterFn<A extends unknown[]> {
    (m: ModuleExports, id: number, raw: boolean): boolean
    filter: FilterPredicate<A>
    /**
     * Whether the filter is raw
     */
    raw: boolean
    /**
     * The key for the filter
     */
    key: string
}

export interface Filter<A extends unknown[]> {
    (...args: A): FilterFn<A>
    raw(...args: A): FilterFn<A>
    /**
     * Generates a unique key for this value
     * @param args The value to generate a key for
     */
    keyFor(args: A): string
}

/// LAZY MODULES

/** @internal */
export interface LazyModuleContext<A extends unknown[] = unknown[]> {
    filter: FilterFn<A>
    getModuleId(): number | undefined
    getExports(cb: (exports: ModuleExports) => void): () => void
    subscribe(cb: (exports: ModuleExports) => void): () => void
    forceLoad(): ModuleExports
    get cache(): ModuleExports
}

export type LazyModule<T> = T extends unknown | undefined
    ?
          | undefined
          | (NonNullable<T> & {
                [lazyContextSymbol]: LazyModuleContext
            })
    : T & {
          [lazyContextSymbol]: LazyModuleContext
      }

/// COMMON

export namespace DiscordModules {
    export interface LinkingUtils {
        /**
         * Shows an action sheet with options for the given URL
         * @param options Options for the action sheet
         */
        showLongPressUrlActionSheet(options: {
            urlString: string
            guildId: string
            channelId: string
            messageId: string
        }): void
        /**
         * Opens a URL
         * @param url The URL to open
         * @param options Options for opening the URL
         * @param options.allowExternal Whether to allow opening external URLs
         * @param options.forceExternalBrowser Whether to force opening the URL in an external browser
         */
        openURL(url: string, options?: { allowExternal: boolean; forceExternalBrowser: boolean }): void
        /**
         * Opens a deep link
         * @param link The deep link to open
         */
        openDeepLink(link?: string): void
    }

    export namespace Flux {
        // biome-ignore lint/suspicious/noExplicitAny: shuddhup
        export type DispatcherPayload = any
        // biome-ignore lint/suspicious/noExplicitAny: shuddhup again
        export type DispatcherDependency = any

        export interface Dispatcher {
            _actionHandlers: unknown
            _interceptors?: ((payload: DispatcherPayload) => undefined | boolean)[]
            _currentDispatchActionType: undefined | string
            _processingWaitQueue: boolean
            _subscriptions: Record<string, Set<(payload: DispatcherPayload) => void>>
            _waitQueue: unknown[]
            addDependencies(node1: DispatcherDependency, node2: DispatcherDependency): void
            dispatch(payload: DispatcherPayload): Promise<void>
            flushWaitQueue(): void
            isDispatching(): boolean
            register(
                name: string,
                actionHandler: Record<string, (e: DispatcherPayload) => void>,
                storeDidChange: (e: DispatcherPayload) => boolean,
            ): string
            setInterceptor(interceptor?: (payload: DispatcherPayload) => undefined | boolean): void
            /**
             * Subscribes to an action type
             * @param actionType The action type to subscribe to
             * @param callback The callback to call when the action is dispatched
             */
            subscribe(actionType: string, callback: (payload: DispatcherPayload) => void): void
            /**
             * Unsubscribes from an action type
             * @param actionType The action type to unsubscribe from
             * @param callback The callback to remove
             */
            unsubscribe(actionType: string, callback: (payload: DispatcherPayload) => void): void
            // TODO: Document this
            wait(cb: () => void): void
        }
    }

    export type InviteUtils = {
        __stub?: any
    }

    export type ClipboardUtils = typeof import('@react-native-clipboard/clipboard').default

    export type MessageUtils = {
        __stub?: any
    }

    /**
     * Discord's logger
     *
     * Logs will be shown in the **Debug Logs** section in settings
     */
    export class Logger {
        constructor(tag: string)
        log(...args: unknown[]): void
        error(...args: unknown[]): void
        warn(...args: unknown[]): void
        info(...args: unknown[]): void
        debug(...args: unknown[]): void
        time(...args: unknown[]): void
        trace(...args: unknown[]): void
        verbose(...args: unknown[]): void
    }

    export namespace Styles {
        export type TextType = 'heading' | 'text'
        export type BasicTextSize = 'sm' | 'md' | 'lg'
        export type BasicTextSizeWithExtraLarges = BasicTextSize | 'xl' | 'xxl'
        export type TextSize = BasicTextSizeWithExtraLarges | 'xs' | 'xxs'
        export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold'
        export type TextWeightWithExtraBold = TextWeight | 'extrabold'
        export type RedesignTextCategory = 'message-preview' | 'channel-title'

        export type TextVariant =
            | `heading-${BasicTextSizeWithExtraLarges}/${TextWeightWithExtraBold}`
            | `text-${TextSize}/${TextWeight}`
            | `display-${BasicTextSize}`
            | `redesign/${RedesignTextCategory}/${TextWeight}`
            | 'redesign/heading-18/bold'
            | 'eyebrow'

        export type TextStyleSheet = Record<TextVariant, TextProps>
        export type CreateStylesFn = <const S extends Record<string, TextStyle | ViewStyle | ImageStyle>>(
            styles: S,
        ) => () => S
    }

    export namespace Components {
        // Buttons
        export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'
        export type Button = React.FC<
            PressableProps & {
                renderIcon?(): ReactNode
                renderRightIcon?(): ReactNode
                renderShine?(): ReactNode
                renderLinearGradient?(): ReactNode
                cornerRadius?: number
                textStyle?: TextStyle
                loadingColorLight?: string
                loadingColorDark?: string
                disabled?: boolean
                size?: ButtonSize
                text: string
                onPress?: () => unknown
                variant?:
                    | 'primary'
                    | 'secondary'
                    | 'destructive'
                    | 'active'
                    | 'primary-overlay'
                    | 'green'
                    | 'red'
                    | 'grey'
                    | 'lightgrey'
                    | 'transparent'
                    | 'white'
            }
        >
        export type TwinButtons = React.FC
        export type IconButton = React.FC
        export type RowButton = React.FC
        export type ImageButton = React.FC
        export type FloatingActionButton = React.FC

        // Layouts
        export type Stack = React.FC<
            ViewProps & {
                spacing?: number
                direction?: 'vertical' | 'horizontal'
            }
        >
        export type Card = React.FC<
            ViewProps & {
                start?: boolean
                end?: boolean
                variant?: 'primary' | 'secondary'
                border?: 'faint' | 'normal' | 'strong' | 'subtle'
                // TODO
                shadow?: 'none'
                children: ReactNode
            }
        >
        export type PressableScale = React.FC

        // Inputs
        export type TextInput = React.FC<TextInputProps>
        export type TextField = React.FC<TextInputProps>
        export type TextArea = React.FC
        export type GhostInput = React.FC

        // Forms
        export type FormSwitch = React.FC
        export type FormRadio = React.FC
        export type FormCheckbox = React.FC

        // Segmented controls
        export type SegmentedControl = React.FC
        export type SegmentedControlPages = React.FC
        export type SegmentedControlStateArgs = {
            initialSelectedIndex: number
            onChange: (index: number) => void
        }
        export type SegmentedControlState = {
            selectedIndex: number
        }

        // Sheets
        export type ActionSheet = React.FC
        export type ActionSheetCloseButton = React.FC
        export type ActionSheetRow = React.FC
        export type ActionSheetSwitchRow = React.FC
        export type ActionSheetIconHeader = React.FC
        export type ActionSheetHeaderBar = React.FC
        export type BottomSheetTitleHeader = React.FC

        export type IconSize =
            | 'extraSmall10'
            | 'extraSmall'
            | 'small'
            | 'small20'
            | 'medium'
            | 'large'
            | 'custom'
            | 'refreshSmall16'
            | 'small14'

        // Tables
        export type TableRowVariant = 'default' | 'danger'
        export type TableRowProps = {
            label: string
            subLabel?: string
            icon?: ReactNode
            trailing?: ReactNode
            arrow?: boolean
            onPress?: PressableProps['onPress']
            disabled?: boolean
            draggable?: boolean
            dragHandlePressableProps?: PressableProps
            labelLineClamp?: number
            subLabelLineClamp?: number
            // TODO
            start?: unknown
            end?: unknown
            variant?: TableRowVariant
        }
        export type TableRowGroupProps = {
            title?: string
            description?: string
            hasIcons?: boolean
            accessibilityLabel?: string
            accessibilityRole?: string
            children: React.ReactNode
        }
        export type TableRow = React.FC<TableRowProps> & {
            Arrow: React.FC
            Icon: TableRowIcon
        }
        export type TableSwitchRow = React.FC<
            Omit<TableRowProps, 'trailing'> & {
                accessibilityHint?: string
                value: boolean
                onValueChange(value: boolean): void
            }
        >
        export type TableRowGroup = React.FC<TableRowGroupProps>
        export type TableRowGroupTitle = React.FC<{
            title: string
        }>
        export type TableRowIconVariant =
            | 'default'
            | 'blurple'
            | 'boosting-pink'
            | 'status-online'
            | 'status-idle'
            | 'status-dnd'
            | 'status-offline'
            | 'xbox'
            | 'playstation'
            | 'danger'
            | 'secondary'
            | 'translucent'
        export type TableRowIcon = React.FC<{
            source: ImageSourcePropType
            variant?: TableRowIconVariant
        }>
        export type TableRadioGroup<T = unknown> = React.FC<
            TableRowGroupProps & {
                onChange(value: T): void
            }
        >
        export type TableCheckboxRow = React.FC<
            Omit<TableRowProps, 'trailing'> & {
                accessibilityHint?: string
                checked: boolean
                // TODO
                onPress: unknown
            }
        >
        export type TableRadioRow<T = unknown> = React.FC<
            Omit<TableRowProps, 'trailing'> & {
                accessibilityHint?: string
                value: T
            }
        >
        export type TableRowTrailingText = React.FC<{
            text: string
        }>

        // Alerts
        export type AlertModal = React.FC
        export type AlertActionButton = Button

        // Menus
        export type ContextMenu = React.FC
        export type ContextMenuContainer = React.FC

        // Other
        export type Slider = React.FC
        export type FlashList = React.FC
        export type Text = React.FC<
            TextProps & {
                variant?: DiscordModules.Styles.TextVariant
                color?: string
                style?: TextStyle
                lineClamp?: number
                ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip'
                tabularNumbers?: boolean
                children?: ReactNode
            }
        >
    }
}
