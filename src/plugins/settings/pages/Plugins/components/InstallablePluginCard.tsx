import { getAssetIndexByName } from '@revenge-mod/assets'
import { Button } from '@revenge-mod/modules/common/components'
import { installPlugin } from '@revenge-mod/plugins'

import PluginCard, { type PluginCardProps } from './PluginCard'

type InstallablePluginCardProps = PluginCardProps & { url: string }

export default function InstallablePluginCard(props: InstallablePluginCardProps) {
    return (
        <PluginCard
            {...props}
            trailing={
                <Button
                    size="sm"
                    variant="primary"
                    icon={getAssetIndexByName('DownloadIcon')}
                    text="Install"
                    onPress={() => installPlugin(props.url)}
                />
            }
        />
    )
}
