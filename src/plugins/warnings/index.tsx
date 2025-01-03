import { ReactNative } from '@revenge-mod/modules/common'
import { AlertActionButton, AlertModal } from '@revenge-mod/modules/common/components'
import { ClientInfoModule } from '@revenge-mod/modules/native'
import { registerPlugin } from '@revenge-mod/plugins/internals'

const MinimumSupportedBuildNumber = ReactNative.Platform.select({ android: 260000, ios: 69233 })!

registerPlugin<{
    supportWarningDismissedAt?: number
}>(
    {
        name: 'Warnings',
        author: 'Revenge',
        description: 'Startup warnings for users that are not using the recommended defaults for Revenge',
        id: 'revenge.warnings',
        version: '1.0.0',
        icon: 'WarningIcon',
    },
    {
        afterAppRender({ revenge: { assets, modules }, storage }) {
            const { alerts, toasts } = modules.common

            // Predicate is already used to indicate whether the plugin is enabled or not
            if (
                // We do !> instead of < in case the value of the left is NaN
                !(Number(ClientInfoModule.Build) > MinimumSupportedBuildNumber) &&
                (storage.supportWarningDismissedAt ?? Date.now()) + 6048e5 > Date.now()
            ) {
                alerts.openAlert(
                    'revenge.plugins.warnings.support-warning',
                    <AlertModal
                        title="Support Warning"
                        content={
                            // biome-ignore lint/style/useTemplate: I can't see the whole message when not doing concatenation
                            'Revenge does not officially support this build of Discord. Please update to a newer version as some features may not work as expected.\n\n' +
                            `Supported Builds: 260.0 (${MinimumSupportedBuildNumber}) and above\nYour Build: ${ClientInfoModule.Version} (${ClientInfoModule.Build})`
                        }
                        actions={
                            <AlertActionButton
                                text="Remind me in 7 days"
                                onPress={() => {
                                    storage.supportWarningDismissedAt = Date.now()
                                    toasts.open({
                                        key: 'revenge.plugins.warnings.support-warning.dismissed',
                                        content: 'You will see this warning again in 7 days',
                                        icon: assets.getIndexByName('ic_warning_24px'),
                                    })
                                }}
                            />
                        }
                    />,
                )
            }
        },
    },
    { external: false, manageable: false },
)
