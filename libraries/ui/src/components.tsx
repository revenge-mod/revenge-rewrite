import { TextInput, FormSwitch as _FormSwitch } from '@revenge-mod/modules/common/components'
import { findProp } from '@revenge-mod/modules/finders'

import { StyleSheet, View } from 'react-native'

import type { DiscordModules } from '@revenge-mod/modules'
import type { ComponentProps } from 'react'

const styles = StyleSheet.create({
    disabled: {
        opacity: 0.5,
    },
})

export function SearchInput(props: ComponentProps<DiscordModules.Components.TextInput>) {
    return (
        <TextInput
            {...props}
            leadingIcon={props.leadingIcon ?? findProp('MagnifyingGlassIcon')!}
            placeholder={props.placeholder ?? 'Search'}
            returnKeyType="search"
        />
    )
}

/**
 * A switch component that is styled to match Discord's configuration
 */
export function FormSwitch(props: ComponentProps<DiscordModules.Components.FormSwitch>) {
    return (
        <View style={props.disabled ? styles.disabled : undefined}>
            <_FormSwitch {...props} />
        </View>
    )
}
