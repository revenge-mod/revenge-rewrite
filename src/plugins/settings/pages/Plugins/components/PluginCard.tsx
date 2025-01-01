import { getAssetIndexByName } from '@revenge-mod/assets'
import { createStyles } from '@revenge-mod/modules/common'
import { Card, Stack, Text } from '@revenge-mod/modules/common/components'
import { SemanticColor } from '@revenge-mod/ui/colors'

import { Image } from 'react-native'
import { styles } from './shared'

import type { ReactNode } from 'react'

const usePluginCardStyles = createStyles({
    icon: {
        width: 20,
        height: 20,
        tintColor: SemanticColor.TEXT_NORMAL,
    },
    card: {
        flexGrow: 1,
        marginBottom: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 4,
    },
    withGap: {
        marginRight: 12,
    },
    topContainer: {
        alignItems: 'center',
    },
    alignedContainer: {
        paddingLeft: 28,
    },
})

export interface PluginCardProps {
    name: string
    description: string
    author: string
    version: string
    icon?: string
    trailing?: ReactNode
    horizontalGaps: boolean
}

export default function PluginCard({
    name,
    description,
    author,
    version,
    icon,
    trailing,
    horizontalGaps,
}: PluginCardProps) {
    const cardStyles = usePluginCardStyles()

    return (
        <Card style={[cardStyles.card, horizontalGaps && cardStyles.withGap]}>
            <Stack direction="horizontal" style={styles.grow}>
                <Stack spacing={8} direction="horizontal" style={[cardStyles.topContainer, styles.autoSize]}>
                    <Image source={getAssetIndexByName(icon ?? 'Revenge.PluginIcon')!} style={cardStyles.icon} />
                    <Text variant="heading-lg/semibold">
                        {name}{' '}
                        <Text variant="text-md/medium" color="text-muted">
                            {version}
                        </Text>
                    </Text>
                </Stack>
                {trailing}
            </Stack>
            <Stack spacing={4} style={[cardStyles.alignedContainer, styles.grow]}>
                <Text style={styles.grow} variant="heading-md/medium" color="text-muted">
                    by {author}
                </Text>
                <Text style={styles.grow} variant="text-md/medium">
                    {description}
                </Text>
            </Stack>
        </Card>
    )
}
