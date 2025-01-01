import { MasonryFlashList } from '@shopify/flash-list'
import { PixelRatio, useWindowDimensions } from 'react-native'

import type { FC, ReactElement } from 'react'
import type { PluginCardProps } from './PluginCard'

export type MasonaryFlashPluginListData<T extends PluginCardProps> = Omit<T, 'horizontalGaps'>[]

export default function MasonaryFlashPluginList<T extends PluginCardProps>({
    data,
    header,
    ListItemComponent,
}: {
    header?: ReactElement
    data: MasonaryFlashPluginListData<T>
    ListItemComponent: FC<T>
}) {
    const dimensions = useWindowDimensions()
    const numColumns = Math.floor((dimensions.width - 16) / 448)
    // Don't ask... I don't know either
    const estimatedItemSize = 24.01 + 32 + 62 * PixelRatio.getFontScale() ** 1.35

    return (
        <MasonryFlashList<T>
            stickyHeaderIndices={header ? [0] : undefined}
            ListHeaderComponent={header}
            renderItem={({ item, columnIndex }) => (
                <ListItemComponent {...item} horizontalGaps={dimensions.width > 464 && columnIndex < numColumns - 1} />
            )}
            data={data as Readonly<T>[]}
            numColumns={numColumns}
            estimatedItemSize={estimatedItemSize}
            keyboardShouldPersistTaps="handled"
        />
    )
}
