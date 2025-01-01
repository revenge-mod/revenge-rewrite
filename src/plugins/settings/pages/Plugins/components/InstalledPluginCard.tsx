import { FormSwitch } from '@revenge-mod/ui/components'

import { openAlert } from '@revenge-mod/modules/common'
import { AlertActionButton, AlertModal } from '@revenge-mod/modules/common/components'
import { BundleUpdaterManager } from '@revenge-mod/modules/native'

import { registeredPlugins } from '@revenge-mod/plugins/internals'

import { useState } from 'react'

import PluginCard, { type PluginCardProps } from './PluginCard'

// TODO: Settings components
export default function InstalledPluginCard({ enabled: _enabled, manageable, id, ...props }: InstalledPluginCardProps) {
    const [enabled, setEnabled] = useState(_enabled)

    return (
        <PluginCard
            {...props}
            trailing={
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

                        setEnabled(enabled)
                    }}
                />
            }
        />
    )
}

interface InstalledPluginCardProps extends PluginCardProps {
    id: string
    enabled: boolean
    manageable: boolean
}

function showReloadRequiredAlert(enabling: boolean) {
    openAlert(
        'revenge.plugins.reload-required',
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
