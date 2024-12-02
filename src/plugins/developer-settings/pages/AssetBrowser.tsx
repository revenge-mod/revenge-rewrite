import { customAssets, getAssetByIndex, getAssetIndexByName } from '@revenge-mod/assets'
import { clipboard, openAlert, toasts } from '@revenge-mod/modules/common'
import {
    AlertActionButton,
    AlertModal,
    FlashList,
    Icons,
    Stack,
    TableRow,
    Text,
} from '@revenge-mod/modules/common/components'
import { cache as metroCache } from '@revenge-mod/modules/metro'
import { SearchInput } from '@revenge-mod/ui/components'

import { useState } from 'react'
import { Image, View } from 'react-native'

import type { Metro } from '@revenge-mod/modules'
import type { ReactNativeInternals } from '@revenge-mod/revenge'
import PageWrapper from 'src/plugins/settings/pages/(Wrapper)'

const DisplayableTypes = new Set(['png', 'jpg', 'svg', 'webp'])

const UndisplayableTypesIconMap = {
    jsona: 'ic_file_text',
    lottie: 'ic_image',
    webm: 'CirclePlayIcon-primary',
    ttf: 'ic_add_text',
    default: 'UnknownGameIcon',
}

function AssetDisplay({
    index,
    asset,
    moduleId,
}: {
    index: number
    asset: ReactNativeInternals.AssetsRegistry.PackagerAsset
    moduleId?: Metro.ModuleID
}) {
    return (
        <TableRow
            variant={DisplayableTypes.has(asset.type) ? 'default' : 'danger'}
            label={asset.name}
            subLabel={`Index: ${index} • Type: ${asset.type} • ${!moduleId ? 'Custom asset' : `Module ID: ${moduleId}`}`}
            icon={
                DisplayableTypes.has(asset.type) ? (
                    <Image source={index} style={{ width: 32, height: 32 }} />
                ) : (
                    <TableRow.Icon
                        variant="danger"
                        source={
                            getAssetIndexByName(
                                asset.type in UndisplayableTypesIconMap
                                    ? UndisplayableTypesIconMap[asset.type as keyof typeof UndisplayableTypesIconMap]
                                    : UndisplayableTypesIconMap.default,
                            )!
                        }
                    />
                )
            }
            onPress={() =>
                openAlert(
                    'revenge.plugins.developer-settings.asset-browser.display',
                    <AlertModal
                        title={asset.name}
                        content={`Index: ${index}\nModule ID: ${moduleId ?? '(custom asset)'}\nType: ${asset.type}`}
                        extraContent={
                            DisplayableTypes.has(asset.type) ? (
                                <Image
                                    resizeMode="contain"
                                    source={index}
                                    style={{ flexGrow: 1, width: 'auto', height: 192 }}
                                />
                            ) : (
                                <Text
                                    variant="text-sm/medium"
                                    color="text-danger"
                                    style={{ width: '100%', textAlign: 'center' }}
                                >
                                    Asset type {asset.type.toUpperCase()} is not supported for preview.
                                </Text>
                            )
                        }
                        actions={
                            <Stack>
                                <AlertActionButton
                                    text="Copy asset name"
                                    variant="primary"
                                    onPress={() => copyToClipboard(asset.name)}
                                />
                                <AlertActionButton
                                    text="Copy asset index"
                                    variant="secondary"
                                    onPress={() => copyToClipboard(index.toString())}
                                />
                            </Stack>
                        }
                    />,
                )
            }
        />
    )
}

function copyToClipboard(text: string) {
    clipboard.setString(text)
    toasts.open({
        key: 'revenge.plugins.developer-settings.asset-browser.copied',
        content: 'Copied to clipboard',
        icon: Icons.CopyIcon,
    })
}

export default function AssetBrowserSettingsPage() {
    const [search, setSearch] = useState('')

    return (
        <PageWrapper>
            <SearchInput size="md" onChange={(v: string) => setSearch(v)} />
            <FlashList
                data={Object.keys(metroCache.assets)
                    .concat(Object.keys(customAssets))
                    .filter(name => {
                        const source =
                            name in metroCache.assets
                                ? metroCache.assets
                                : name in customAssets
                                  ? customAssets
                                  : undefined

                        if (!source) return false
                        return name.toLowerCase().includes(search.toLowerCase()) || source[name]?.toString() === search
                    })
                    .map(name => {
                        const index = (metroCache.assets[name] ?? customAssets[name])!

                        return {
                            index,
                            asset: getAssetByIndex(index)!,
                            moduleId: metroCache.assetModules[name],
                        }
                    })}
                renderItem={({ item }) => <AssetDisplay {...item} />}
                estimatedItemSize={80}
            />
        </PageWrapper>
    )
}
