import { NavigationNative } from '@revenge-mod/modules/common'

import { MasonryFlashList } from '@shopify/flash-list'
import { PixelRatio, useWindowDimensions } from 'react-native'

import PluginCardContext, { type StackNavigationProp } from '../contexts/PluginCardContext'

import type { ComponentType, FC, ReactElement } from 'react'

import type { InternalPluginDefinition } from '@revenge-mod/plugins/internals'
import type { PluginManifest } from '@revenge-mod/plugins/schemas'

import type { PluginCardProps } from './PluginCard'

export type MasonaryFlashPluginListData<T> = Array<
    Omit<(InternalPluginDefinition | PluginManifest) & PluginCardProps & T, 'horizontalGaps'>
>

export default function MasonaryFlashPluginList<T, U>({
    data,
    header,
    ListItemComponentProps,
    ListItemComponent,
    ListFooterComponent,
}: {
    header?: ReactElement
    data: MasonaryFlashPluginListData<T>
    ListItemComponentProps?: (item: MasonaryFlashPluginListData<T>[number]) => Omit<U, 'horizontalGaps'>
    ListItemComponent: FC<U>
    ListFooterComponent?: ComponentType | false
}) {
    const navigation = NavigationNative.useNavigation<StackNavigationProp>()
    const dimensions = useWindowDimensions()
    const numColumns = Math.floor((dimensions.width - 16) / 448)
    // Don't ask... I don't know either
    const estimatedItemSize = 24.01 + 32 + 62 * PixelRatio.getFontScale() ** 1.35

    return (
        <MasonryFlashList<(typeof data)[number]>
            stickyHeaderIndices={header ? [0] : undefined}
            ListHeaderComponent={header}
            renderItem={({ item, columnIndex }) => (
                <PluginCardContext.Provider
                    value={{ navigation, plugin: item as unknown as InternalPluginDefinition, manifest: item! }}
                >
                    {/* @ts-expect-error: I don't know how to type this */}
                    <ListItemComponent
                        {...(ListItemComponentProps ? ListItemComponentProps(item) : item)}
                        horizontalGaps={dimensions.width > 464 && columnIndex < numColumns - 1}
                    />
                </PluginCardContext.Provider>
            )}
            data={data}
            numColumns={numColumns}
            estimatedItemSize={estimatedItemSize}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={ListFooterComponent ? ListFooterComponent : undefined}
        />
    )
}
