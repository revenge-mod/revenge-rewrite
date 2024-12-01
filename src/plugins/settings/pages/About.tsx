import { clipboard, toasts } from '@revenge-mod/modules/common'
import {
    Icons,
    TableRow,
    TableRowGroup,
    TableRowIcon,
    TableRowTrailingText,
} from '@revenge-mod/modules/common/components'
import { ClientInfoModule } from '@revenge-mod/modules/native'

import { type ImageSourcePropType, ScrollView } from 'react-native'
import PageWrapper from './(Wrapper)'

import type { ComponentProps } from 'react'

const { assets } = revenge

export default function AboutSettingsPage() {
    const runtimeProps = (HermesInternal as HermesInternalObject).getRuntimeProperties()

    return (
        <ScrollView>
            <PageWrapper>
                <TableRowGroup title="App">
                    {[
                        {
                            label: 'Revenge',
                            icon: assets.getIndexByName('Revenge.RevengeIcon')!,
                            trailing: `${__REVENGE_RELEASE__} (${__REVENGE_HASH__}${__REVENGE_HASH_DIRTY__ ? '-dirty' : ''})`,
                        },
                        {
                            label: 'Discord',
                            icon: assets.getIndexByName('Discord')!,
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
                            icon: assets.getIndexByName('Revenge.ReactIcon')!,
                            trailing: React.version,
                        },
                        {
                            label: 'React Native',
                            icon: assets.getIndexByName('Revenge.ReactIcon')!,
                            trailing: runtimeProps['OSS Release Version']!.slice(7),
                        },
                        {
                            label: 'Hermes Bytecode',
                            icon: assets.getIndexByName('Revenge.HermesIcon')!,
                            trailing: `${runtimeProps['Bytecode Version']} (${runtimeProps.Build})`,
                        },
                    ].map(props => (
                        // biome-ignore lint/correctness/useJsxKeyInIterable: This page never gets updated
                        <VersionRow {...props} />
                    ))}
                </TableRowGroup>
            </PageWrapper>
        </ScrollView>
    )
}

function VersionRow(
    props: Omit<ComponentProps<typeof TableRow>, 'icon' | 'trailing'> & { icon: ImageSourcePropType; trailing: string },
) {
    return (
        <TableRow
            label={props.label}
            icon={<TableRowIcon source={props.icon} />}
            trailing={<TableRowTrailingText text={props.trailing!} />}
            onPress={() => {
                clipboard.setString(`${props.label} - ${props.trailing}`)
                toasts.open({
                    key: `revenge.toasts.settings.about.copied:${props.label}`,
                    content: 'Copied to clipboard',
                    icon: Icons.CopyIcon,
                })
            }}
        />
    )
}
