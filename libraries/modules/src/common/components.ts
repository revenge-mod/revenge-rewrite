import { lazyDestructure } from '@revenge-mod/utils/lazy'
import { findByName, findByProps, findBySingleProp, findProp } from '../finders'

import type { DiscordModules } from '../types'

// TODO: Type these things...

// Discord
export const HelpMessage = findByName.lazy('HelpMessage') as DiscordModules.Components.HelpMessage

// React Native's included SafeAreaView only adds padding on iOS.
export const { SafeAreaProvider, SafeAreaView } = lazyDestructure(() =>
    findByProps('useSafeAreaInsets'),
) as typeof import('react-native-safe-area-context')

// ActionSheet
export const ActionSheetRow = findProp.lazy('ActionSheetRow')

// Buttons
export const Button = findBySingleProp.lazy('Button') as DiscordModules.Components.Button
export const TwinButtons = findProp.lazy('TwinButtons')
export const IconButton = findBySingleProp.lazy('IconButton') as DiscordModules.Components.IconButton
export const RowButton = findProp.lazy('RowButton') as DiscordModules.Components.RowButton

export const PressableScale = findProp.lazy('PressableScale')

// Tables
export const TableRow = findProp.lazy('TableRow')
export const TableRowIcon = findProp.lazy('TableRowIcon')
export const TableRowTrailingText = findProp.lazy('TableRowTrailingText')
export const TableRowGroup = findProp.lazy('TableRowGroup')
export const TableSwitchRow = findProp.lazy('TableSwitchRow')
export const TableSwitch = findBySingleProp.lazy('FormSwitch')
export const TableRadio = findBySingleProp.lazy('FormRadio')
export const TableCheckbox = findBySingleProp.lazy('FormCheckbox')

export const FormSwitch = findBySingleProp.lazy('FormSwitch')
export const FormRadio = findBySingleProp.lazy('FormRadio')
export const FormCheckbox = findBySingleProp.lazy('FormCheckbox')

// Card
export const Card = findProp.lazy('Card')
// TODO: Checkout what's this
export const RedesignCompat = findProp.lazy('RedesignCompat')

// Misc.
export const Stack = findProp.lazy('Stack') as DiscordModules.Components.Stack

// Inputs
export const TextInput = findBySingleProp.lazy('TextInput') as DiscordModules.Components.TextInput

// SegmentedControl
export const SegmentedControl = findProp.lazy('SegmentedControl') as DiscordModules.Components.SegmentedControl
export const SegmentedControlPages = findProp.lazy(
    'SegmentedControlPages',
) as DiscordModules.Components.SegmentedControlPages
export const useSegmentedControlState = findBySingleProp.lazy('useSegmentedControlState') as (
    arg: DiscordModules.Components.SegmentedControlStateArgs,
) => DiscordModules.Components.SegmentedControlState

export const FloatingActionButton = findProp.lazy(
    'FloatingActionButton',
) as DiscordModules.Components.FloatingActionButton
export const ActionSheet = findProp.lazy('ActionSheet') as DiscordModules.Components.ActionSheet
export const BottomSheetTitleHeader = findProp.lazy('BottomSheetTitleHeader')

export const Text = findProp.lazy('Text', 'LegacyText')

export const FlashList = findProp.lazy('FlashList')
