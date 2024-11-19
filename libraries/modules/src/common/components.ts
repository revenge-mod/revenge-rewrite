import { lazyDestructure } from '@revenge-mod/utils/lazy'
import { findByProps, findBySingleProp, findProp } from '../finders'

import type { DiscordModules } from '../types'

// TODO: Type these things...

// React Native's included SafeAreaView only adds padding on iOS.
export const { SafeAreaProvider, SafeAreaView } = lazyDestructure(() =>
    findByProps('useSafeAreaInsets'),
) as typeof import('react-native-safe-area-context')

/// DISCORD

export const TwinButtons = findProp.lazy('TwinButtons')
export const {
    // Styles

    createStyles,

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
    TextStyleSheet,
} = lazyDestructure(() => findByProps('TextInput', 'ContextMenu')) as {
    Text: DiscordModules.Components.Text,

    TextInput: DiscordModules.Components.TextInput,
    TextArea: DiscordModules.Components.TextArea,
    GhostInput: DiscordModules.Components.GhostInput,
    
    Button: DiscordModules.Components.Button,
    IconButton: DiscordModules.Components.IconButton,
    ImageButton: DiscordModules.Components.ImageButton,
    FloatingActionButton: DiscordModules.Components.FloatingActionButton,
    RowButton: DiscordModules.Components.RowButton,
    
    TableRow: DiscordModules.Components.TableRow,
    TableSwitchRow: DiscordModules.Components.TableSwitchRow,
    TableRowGroup: DiscordModules.Components.TableRowGroup,
    TableRowIcon: DiscordModules.Components.TableRowIcon,
    TableRadioGroup: DiscordModules.Components.TableRadioGroup,
    TableCheckboxRow: DiscordModules.Components.TableCheckboxRow,
    TableRadioRow: DiscordModules.Components.TableRadioRow,
    
    AlertModal: DiscordModules.Components.AlertModal,
    AlertActionButton: DiscordModules.Components.AlertActionButton,
    dismissAlerts: unknown,
    openAlert: unknown,
    
    Card: DiscordModules.Components.Card,
    Stack: DiscordModules.Components.Stack,

    Slider: DiscordModules.Components.Slider,
    
    createStyles: unknown,
    TextStyleSheet: unknown,
}

export const PressableScale = findProp.lazy('PressableScale')

// Tables
export const TableRowTrailingText = findProp.lazy('TableRowTrailingText')
export const TableSwitch = findBySingleProp.lazy('FormSwitch')
export const TableRadio = findBySingleProp.lazy('FormRadio')
export const TableCheckbox = findBySingleProp.lazy('FormCheckbox')

export const FormSwitch = findBySingleProp.lazy('FormSwitch')
export const FormRadio = findBySingleProp.lazy('FormRadio')
export const FormCheckbox = findBySingleProp.lazy('FormCheckbox')

export const FlashList = findProp.lazy('FlashList')
