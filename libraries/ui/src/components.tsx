import { TextInput } from '@revenge-mod/modules/common/components'
import { findProp } from '@revenge-mod/modules/finders'

import type { DiscordModules } from '@revenge-mod/modules'
import type { ComponentProps } from 'react'

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
