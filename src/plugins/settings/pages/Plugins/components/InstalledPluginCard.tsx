import { getAssetIndexByName } from '@revenge-mod/assets'
import { FormSwitch } from '@revenge-mod/ui/components'
import { Show } from '@revenge-mod/utils/components'
import { useRerenderer } from '@revenge-mod/utils/hooks'

import { openAlert } from '@revenge-mod/modules/common'
import { AlertActionButton, AlertModal, IconButton } from '@revenge-mod/modules/common/components'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'

import { registeredPlugins } from '@revenge-mod/plugins/internals'


import { useContext } from 'react'

import PluginCard, { type PluginCardProps } from './PluginCard'
import PluginCardContext from '../contexts/PluginCardContext'

export default function InstalledPluginCard(props: PluginCardProps) {
    const {
        plugin,
        manifest: { name },
        navigation,
    } = useContext(PluginCardContext)
    const { SettingsComponent, enabled, id, manageable, context } = plugin!

    const rerender = useRerenderer()

    return (
        <PluginCard
            {...props}
            trailing={
                <>
                    <Show when={SettingsComponent}>
                        <IconButton
                            disabled={!enabled}
                            size="sm"
                            icon={getAssetIndexByName('SettingsIcon')}
                            variant="tertiary"
                            onPress={() => {
                                navigation.navigate('RevengeCustomPage', {
                                    title: name,
                                    // @ts-expect-error: I love TypeScript
                                    render: () => <SettingsComponent {...context} />,
                                })
                            }}
                            style={{ marginBottom: 'auto' }}
                        />
                    </Show>
                    <IconButton
                        size="sm"
                        icon={getAssetIndexByName('MoreHorizontalIcon')}
                        variant="tertiary"
                        style={{ marginBottom: 'auto' }}
                    />
                    <FormSwitch
                        value={enabled}
                        disabled={!manageable}
                        onValueChange={async enabled => {
                            const plugin = registeredPlugins[id]!

                            if (enabled) {
                                plugin.enable()
                                if (plugin.lifecycles.beforeAppRender || plugin.lifecycles.subscribeModules)
                                    showReloadRequiredAlert(enabled)
                                else await plugin.start()
                            } else {
                                const { reloadRequired } = plugin.disable()
                                if (reloadRequired) showReloadRequiredAlert(enabled)
                            }

                            rerender()
                        }}
                    />
                </>
            }
        />
    )
}

function showReloadRequiredAlert(enabling: boolean) {
    openAlert(
        'revenge.plugins.settings.plugins.reload-required',
        <AlertModal
            title="Reload required"
            content={
                enabling
                    ? 'The plugin you have enabled requires a reload to take effect. Would you like to reload now?'
                    : 'The plugin you have disabled requires a reload to reverse its effects. Would you like to reload now?'
            }
            actions={
                <>
                    <AlertActionButton
                        variant="destructive"
                        text="Reload"
                        onPress={() => BundleUpdaterManager.reload()}
                    />
                    <AlertActionButton variant="secondary" text="Not now" />
                </>
            }
        />,
    )
}
