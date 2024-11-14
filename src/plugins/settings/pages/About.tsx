import { clipboard, toasts } from '@revenge-mod/modules/common'
import {
    Stack,
    TableRow,
    TableRowGroup,
    TableRowIcon,
    TableRowTrailingText,
} from '@revenge-mod/modules/common/components'
import type { ComponentProps } from 'react'
import RevengeIcon from '../../../assets/revenge.png'
import { ClientInfoModule } from '@revenge-mod/modules/native'

const { assets, modules } = revenge

export default function AboutSettingsPage() {
    const hermesProps = (HermesInternal as any).getRuntimeProperties()

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
                        icon: assets.getIndexByName('ic_category_16px'),
                        trailing: React.version,
                    },
                    {
                        label: 'React Native',
                        icon: assets.getIndexByName('mobile'),
                        trailing: hermesProps['OSS Release Version'].slice(7),
                    },
                    {
                        label: 'Hermes Bytecode',
                        icon: assets.getIndexByName('ic_server_security_24px'),
                        trailing: `${hermesProps['Bytecode Version']} (${hermesProps.Build})`,
                    },
                ].map(props => (
                    // biome-ignore lint/correctness/useJsxKeyInIterable: This page never gets updated
                    <VersionRow {...props} />
                ))}
            </TableRowGroup>
        </Stack>
    )
}

function VersionRow(props: ComponentProps<typeof TableRow>) {
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
                    icon: assets.getIndexByName("CopyIcon")
                })
            }}
        />
    )
}
