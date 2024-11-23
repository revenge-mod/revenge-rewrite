import { clipboard, toasts } from '@revenge-mod/modules/common'
import {
    Stack,
    TableRow,
    TableRowGroup,
    TableRowIcon,
    TableRowTrailingText,
} from '@revenge-mod/modules/common/components'
import { ClientInfoModule } from '@revenge-mod/modules/native'

import HermesIcon from '../../../assets/hermes.webp'
import ReactIcon from '../../../assets/react.webp'
import RevengeIcon from '../../../assets/revenge.webp'

import type { ComponentProps } from 'react'
import type { ImageSourcePropType } from 'react-native'

const { assets } = revenge

export default function AboutSettingsPage() {
    const runtimeProps = (HermesInternal as HermesInternalObject).getRuntimeProperties()

    return (
        <Stack style={{ paddingHorizontal: 16, paddingVertical: 24 }} spacing={16} direction="vertical">
            <TableRowGroup title="App">
                {[
                    {
                        label: 'Revenge',
                        icon: {
                            uri: RevengeIcon,
                        },
                        trailing: __BUNDLE_RELEASE__,
                    },
                    {
                        label: 'Discord',
                        icon: assets.getIndexByName('Discord'),
                        trailing: `${ClientInfoModule.Version} (${ClientInfoModule.Build})`,
                    },
                ].map(props => (
                    // biome-ignore lint/correctness/useJsxKeyInIterable: This page never gets updated
                    <VersionRow {...props} />
                ))}
            </TableRowGroup>
            <TableRowGroup title="React">
                {[
                    {
                        label: 'React',
                        icon: {
                            uri: ReactIcon,
                        },
                        trailing: React.version,
                    },
                    {
                        label: 'React Native',
                        icon: {
                            uri: ReactIcon,
                        },
                        trailing: runtimeProps['OSS Release Version']!.slice(7),
                    },
                    {
                        label: 'Hermes Bytecode',
                        icon: {
                            uri: HermesIcon,
                        },
                        trailing: `${runtimeProps['Bytecode Version']} (${runtimeProps.Build})`,
                    },
                ].map(props => (
                    // biome-ignore lint/correctness/useJsxKeyInIterable: This page never gets updated
                    <VersionRow {...props} />
                ))}
            </TableRowGroup>
        </Stack>
    )
}

function VersionRow(props: Omit<ComponentProps<typeof TableRow>, 'icon'> & { icon: ImageSourcePropType }) {
    return (
        <TableRow
            label={props.label}
            icon={<TableRowIcon source={props.icon} />}
            trailing={<TableRowTrailingText text={props.trailing} />}
            onPress={() => {
                clipboard.setString(`${props.label} - ${props.trailing}`)
                toasts.open({
                    key: `revenge.toasts.settings.about.copied:${props.label}`,
                    content: 'Copied to clipboard',
                    icon: assets.getIndexByName('CopyIcon'),
                })
            }}
        />
    )
}
