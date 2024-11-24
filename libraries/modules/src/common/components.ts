import { lazyDestructure } from '@revenge-mod/utils/lazy'
import { findByProps, findBySingleProp, findProp } from '../finders'

import type { DiscordModules } from '../types'

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
    dismissAlerts,
    openAlert,

    // Inputs

    TextInput,
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
            TextArea: DiscordModules.Components.TextArea
            GhostInput: DiscordModules.Components.GhostInput

            Button: DiscordModules.Components.Button
            IconButton: DiscordModules.Components.IconButton
            ImageButton: DiscordModules.Components.ImageButton
            FloatingActionButton: DiscordModules.Components.FloatingActionButton
            RowButton: DiscordModules.Components.RowButton

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
            dismissAlerts: unknown
            openAlert: unknown

            Card: DiscordModules.Components.Card
            Stack: DiscordModules.Components.Stack

            Slider: DiscordModules.Components.Slider
        }>('TextInput', 'ContextMenu')!,
)

export const PressableScale = findProp('PressableScale')

// Tables
export const TableRowTrailingText = findProp<DiscordModules.Components.TableRowTrailingText>('TableRowTrailingText')!
export const TableSwitch = findBySingleProp('FormSwitch')
export const TableRadio = findBySingleProp('FormRadio')
export const TableCheckbox = findBySingleProp('FormCheckbox')

export const FormSwitch = findBySingleProp('FormSwitch')
export const FormRadio = findBySingleProp('FormRadio')
export const FormCheckbox = findBySingleProp('FormCheckbox')

export const FlashList = findProp('FlashList')
