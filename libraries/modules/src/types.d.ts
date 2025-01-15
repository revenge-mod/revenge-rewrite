/// <reference path="../../../node_modules/@react-navigation/core/lib/typescript/src/index.d.ts" />

import type { NavigationNativeStackNavigationParamList } from '@revenge-mod/modules/common'
import type { If, Nullish } from '@revenge-mod/shared/types'

import type { ComponentProps, ComponentType, FC, ReactNode, JSX } from 'react'
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

import type { Message } from 'discord-types/general'
import type { Command } from './common/commands'
import type { MetroModuleFilePathKey } from './constants'
import type { lazyContextSymbol } from './utils/lazy'

/// METRO

/** @see {@link https://github.com/facebook/metro/blob/1361405ffe6f1bdef54295addfef0f30523aaab2/packages/metro-runtime/src/polyfills/require.js} */
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

    export interface ModuleDefinition<Initialized = boolean> {
        /** Set to undefined once module is initialized */
        dependencyMap: If<Initialized, undefined, DependencyMap>
        /** Error value thrown by the factory */
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

    export type ModuleList = Map<ModuleID, ModuleDefinition>

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
    export interface FilePickerFile {
        fileCopyUri: string | null
        size: number
        name: string
        type: string
        uri: string
    }

    export interface FilePickerUtils {
        handleDocumentSelection(options?: { pickMultiple?: boolean }): Promise<FilePickerFile[] | undefined>
    }

    export interface ToastActionCreators {
        open(options: {
            key: string
            content?: string
            icon?: number | FC
            IconComponent?: FC
            /**
             * The icon's color, same string format as `<Text>`'s color prop
             */
            iconColor?: string
            containerStyle?: ViewStyle
        })
        close(): void
    }

    export interface Alerts {
        openAlert(key: string, alert: JSX.Element): void
        dismissAlerts(): void
    }

    export interface ActionSheets {
        openLazy<T extends ComponentType>(sheet: Promise<{ default: T }>, key: string, props: ComponentProps<T>): void
        hideActionSheet(key?: string): void
    }

    export namespace ActionSheets {
        interface SimpleActionSheetOption {
            icon?: number
            label: string
            isDestructive?: boolean
            disabled?: boolean
            onPress?(): void
        }

        function showSimpleActionSheet(options: {
            key: string
            header: {
                title: string
                icon?: ReactNode
                onClose?(): void
            }
            options: SimpleActionSheetOption[]
        }): void
    }

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
        openDeeplink(link?: string): void
    }

    export namespace Flux {
        export type DispatcherPayload = any
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

    export interface CommandUtils {
        // STUB document these args
        getBuiltInCommands(foo: [1], bar: true, baz: false): Command[]
    }

    export type InviteUtils = {
        __stub?: any
    }

    export type ClipboardUtils = typeof import('@react-native-clipboard/clipboard').default

    export type MessageUtils = {
        sendMessage(channelId: string, { content: string }): Promise<Message>
        editMessage(channelId: string, messageId: string, { content: string }): Promise<Message>
        sendBotMessage(channelId: string, content: string): Promise<Message>
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
        export type BaseButtonProps = PressableProps & {
            disabled?: boolean
            size?: ButtonSize
            variant?:
                | 'primary'
                | 'secondary'
                | 'tertiary'
                | 'destructive'
                | 'active'
                | 'primary-overlay'
                | 'secondary-overlay'
            loading?: boolean
            grow?: boolean
            scaleAmountInPx?: number
        }

        // Buttons
        export type ButtonSize = 'sm' | 'md' | 'lg'
        export type Button = FC<
            BaseButtonProps & {
                icon?: number
                loading?: boolean
                iconPosition?: 'start' | 'end'
                renderIcon?(): ReactNode
                renderRightIcon?(): ReactNode
                renderShine?(): ReactNode
                renderLinearGradient?(): ReactNode
                cornerRadius?: number
                textStyle?: TextStyle
                loadingColorLight?: string
                loadingColorDark?: string
                text: string
            }
        >
        export type TwinButtons = FC
        export type IconButton = FC<
            BaseButtonProps & {
                icon: number
                label?: string
            }
        >
        export type RowButton = FC
        export type ImageButton = FC<
            BaseButtonProps & {
                image: ImageSourcePropType
            }
        >
        export type FloatingActionButton = FC

        // Layouts
        export type Stack = FC<
            ViewProps & {
                spacing?: number
                direction?: 'vertical' | 'horizontal'
            }
        >
        export type Card = FC<
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
        export type PressableScale = FC

        // Inputs
        export type TextFieldProps = {
            onChange?: (value: string) => void
            onBlur?: () => void
            onFocus?: () => void

            leadingIcon?: () => JSX.Element
            trailingIcon?: () => JSX.Element
            leadingText?: string
            trailingText?: string
            description?: string
            errorMessage?: string

            isDisabled?: boolean
            focusable?: boolean
            editable?: boolean
            status?: TextFieldStatus

            defaultValue?: string
            value?: string

            placeholder?: string
            placeholderTextColor?: string

            maxLength?: number
            multiline?: boolean

            autoFocus?: boolean
            secureTextEntry?: boolean
            returnKeyType?: TextInputProps['returnKeyType']
            isClearable?: boolean

            size?: TextFieldSize
            style?: ViewStyle | ViewStyle[]
        }

        export type TextFieldSize = 'sm' | 'md' | 'lg'

        export type TextFieldStatus = 'default' | 'error'

        export type TextInput = FC<
            TextFieldProps & {
                isRound?: boolean
                label?: string
            }
        >
        export type TextField = FC<TextFieldProps>
        export type TextArea = FC<Omit<ComponentProps<TextInput>, 'multiline'>>
        export type GhostInput = FC

        // Forms
        export type FormSwitch = FC<
            ViewProps & {
                value: boolean
                onValueChange(value: boolean): void
                disabled?: boolean
            }
        >
        export type FormRadio = FC
        export type FormCheckbox = FC

        // Segmented controls
        export type SegmentedControl = FC
        export type SegmentedControlPages = FC
        export type SegmentedControlStateArgs = {
            initialSelectedIndex: number
            onChange: (index: number) => void
        }
        export type SegmentedControlState = {
            selectedIndex: number
        }

        // Sheets
        export type ActionSheet = FC<{ children: ReactNode }>
        export type ActionSheetCloseButton = FC<Pick<ComponentProps<IconButton>, 'variant' | 'onPress'>>
        export type ActionSheetRow = FC & {
            Icon: ActionSheetRowIcon
            Group: ActionSheetRowGroup
        }
        export type ActionSheetRowIcon = TableRowIcon
        export type ActionSheetRowGroup = TableRowGroup
        export type ActionSheetSwitchRow = TableSwitchRow
        // export type ActionSheetIconHeader = FC
        // export type ActionSheetHeaderBar = FC
        // export type BottomSheetTitleHeader = FC

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
            children: ReactNode
        }
        export type TableRow = FC<TableRowProps> & {
            Arrow: FC
            Icon: TableRowIcon
        }
        export type TableSwitchRow = FC<
            Omit<TableRowProps, 'trailing'> & {
                accessibilityHint?: string
                value: boolean
                onValueChange(value: boolean): void
            }
        >
        export type TableRowGroup = FC<TableRowGroupProps>
        export type TableRowGroupTitle = FC<{
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
        export type TableRowIcon = FC<{
            source: ImageSourcePropType
            variant?: TableRowIconVariant
        }>
        export type TableRadioGroup<T = unknown> = FC<
            TableRowGroupProps & {
                onChange(value: T): void
            }
        >
        export type TableCheckboxRow = FC<
            Omit<TableRowProps, 'trailing'> & {
                accessibilityHint?: string
                checked: boolean
                // TODO
                onPress: unknown
            }
        >
        export type TableRadioRow<T = unknown> = FC<
            Omit<TableRowProps, 'trailing'> & {
                accessibilityHint?: string
                value: T
            }
        >
        export type TableRowTrailingText = FC<{
            text: string
        }>

        // Alerts
        export type AlertModal = FC<{
            title: string
            content?: ReactNode
            extraContent?: ReactNode
            actions?: ReactNode
        }>
        export type AlertActionButton = Button

        // Menus
        export type ContextMenu = FC<{
            title: ReactNode
            triggerOnLongPress?: boolean
            items: Array<ContextMenuItem | ContextMenuItem[]>
            align?: 'left' | 'right' | 'above' | 'below'
            children: (props: Partial<BaseButtonProps>) => ReactNode
        }>

        export type ContextMenuItem = {
            label: string
            IconComponent?: FC
            variant?: 'default' | 'destructive'
            action(): void
        }

        // Other
        export type Slider = FC<{
            value: number
            step: number
            minimumValue: number
            maximumValue: number
            onValueChange?: (value: number) => void
            onSlidingStart?: () => void
            onSlidingComplete?: () => void
            startIcon?: ReactNode
            endIcon?: ReactNode
        }>

        export type Text = FC<
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

        export type IntlLink = FC<{
            target: string
            children?: ReactNode
        }>
    }
}

declare global {
    namespace ReactNavigation {
        interface RootParamList extends NavigationNativeStackNavigationParamList {
            [key: string]: any
        }
    }
}
