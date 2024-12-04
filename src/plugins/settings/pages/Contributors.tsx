import { getAssetIndexByName } from '@revenge-mod/assets'
import { links } from '@revenge-mod/modules/common'
import { TableRow, TableRowGroup, TableRowIcon } from '@revenge-mod/modules/common/components'

import { Image, ScrollView, StyleSheet } from 'react-native'

import Contributors from '../contributors'
import PageWrapper from './(Wrapper)'

const styles = StyleSheet.create({
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
})

export default function ContributorsSettingsPage() {
    return (
        <ScrollView>
            <PageWrapper>
                <ContributorsSection title="Team" data={Contributors.team} />
                <ContributorsSection title="Contributors" data={Contributors.contributors} />
            </PageWrapper>
        </ScrollView>
    )
}

export function ContributorsSection({
    title,
    data,
}: { title: string; data: (typeof Contributors)[keyof typeof Contributors] }) {
    if (!data.length) return null

    return (
        <TableRowGroup title={title}>
            {data.map(item => {
                const icon = getAssetIndexByName(`Revenge.Contributors.${item.name}`)

                return (
                    // biome-ignore lint/correctness/useJsxKeyInIterable: This list never changes
                    <TableRow
                        icon={
                            icon ? (
                                <Image style={styles.avatar} source={icon} />
                            ) : (
                                <TableRowIcon source={getAssetIndexByName('FriendsIcon')!} />
                            )
                        }
                        label={item.name}
                        subLabel={item.roles.join(' • ')}
                        onPress={item.url ? () => links.openURL(item.url!) : undefined}
                        arrow={!!item.url}
                    />
                )
            })}
        </TableRowGroup>
    )
}
