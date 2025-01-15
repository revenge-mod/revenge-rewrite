import { lazyDestructure } from '@revenge-mod/utils/lazy'
import { findByProps, findProp, findSingleProp } from '../../finders'

import type { DiscordModules } from '../../types'

export * as Icons from './icons'

// React Native's included SafeAreaView only adds padding on iOS.
export const { SafeAreaProvider, SafeAreaView } = lazyDestructure(
    () => findByProps.eager('useSafeAreaInsets')!,
) as typeof import('react-native-safe-area-context')

/// DISCORD

export const TwinButtons = findProp('TwinButtons')
export const {
    // Buttons

    Button,
    IconButton,
    ImageButton,
    FloatingActionButton,
    RowButton,

    // Context Menus
    ContextMenu,

    // Tables

    TableRow,
    TableSwitchRow,
    TableRowGroup,
    TableRowGroupTitle,
    TableRowIcon,
    TableRadioGroup,
    TableCheckboxRow,
    TableRadioRow,

    // Alerts

    AlertModal,
    AlertActionButton,

    // Sheets
    ActionSheet,
    ActionSheetCloseButton,
    ActionSheetRow,

    // Inputs

    TextInput,
    TextField,
    TextArea,
    GhostInput,

    // Containers

    Card,
    Stack,

    // Other

    Slider,

    // Text

    Text,
} = lazyDestructure(
    () =>
        findByProps.eager<{
            Text: DiscordModules.Components.Text

            TextInput: DiscordModules.Components.TextInput
            TextField: DiscordModules.Components.TextField
            TextArea: DiscordModules.Components.TextArea
            GhostInput: DiscordModules.Components.GhostInput

            ActionSheet: DiscordModules.Components.ActionSheet
            ActionSheetCloseButton: DiscordModules.Components.ActionSheetCloseButton
            ActionSheetRow: DiscordModules.Components.ActionSheetRow

            Button: DiscordModules.Components.Button
            IconButton: DiscordModules.Components.IconButton
            ImageButton: DiscordModules.Components.ImageButton
            FloatingActionButton: DiscordModules.Components.FloatingActionButton
            RowButton: DiscordModules.Components.RowButton

            ContextMenu: DiscordModules.Components.ContextMenu

            TableRow: DiscordModules.Components.TableRow
            TableSwitchRow: DiscordModules.Components.TableSwitchRow
            TableRowGroup: DiscordModules.Components.TableRowGroup
            TableRowGroupTitle: DiscordModules.Components.TableRowGroupTitle
            TableRowIcon: DiscordModules.Components.TableRowIcon
            TableRadioGroup: DiscordModules.Components.TableRadioGroup
            TableCheckboxRow: DiscordModules.Components.TableCheckboxRow
            TableRadioRow: DiscordModules.Components.TableRadioRow

            AlertModal: DiscordModules.Components.AlertModal
            AlertActionButton: DiscordModules.Components.AlertActionButton

            Card: DiscordModules.Components.Card
            Stack: DiscordModules.Components.Stack

            Slider: DiscordModules.Components.Slider
        }>('TextField', 'ContextMenu')!,
)

export const IntlLink = findProp<DiscordModules.Components.IntlLink>('IntlLink')!

export const PressableScale = findProp('PressableScale')

// Tables
export const TableRowTrailingText = findProp<DiscordModules.Components.TableRowTrailingText>('TableRowTrailingText')!

/**
 * You should probably use `FormSwitch` from `@revenge-mod/ui/components` instead. This does not style itself disabled even when you pass the `disabled` prop.
 */
export const FormSwitch = findSingleProp<DiscordModules.Components.FormSwitch>('FormSwitch')!
export const FormRadio = findSingleProp<DiscordModules.Components.FormRadio>('FormRadio')!
export const FormCheckbox = findSingleProp<DiscordModules.Components.FormCheckbox>('FormCheckbox')!

export const { FlashList, MasonryFlashList } = lazyDestructure(
    () => findByProps.eager<typeof import('@shopify/flash-list')>('FlashList')!,
)
