// TODO: Fix this path
import { ClientInfoModule } from '@revenge-mod/modules/native'
import { registerPlugin } from 'libraries/plugins/src/internals'
import { ReactNative } from '@revenge-mod/modules/common';

// TODO: Is this iOS version actually a reasonable minimum?
const MinimumSupportedBuildNumber = ReactNative.Platform.select({ android: 250000, ios: 65235 })!

registerPlugin<{
    supportWarningDismissedAt?: number
}>(
    {
        name: 'Warnings',
        author: 'The Revenge Team',
        description: 'Startup warnings for users that are not using the recommended defaults for Revenge',
        id: 'revenge.warnings',
        version: '1.0.0',
        icon: 'WarningIcon',
        async afterAppRender({ revenge: { assets, modules }, storage }) {
            const { legacy_alerts, toasts } = modules.common

            // Predicate is already used to indicate whether the plugin is enabled or not
            if ((storage.supportWarningDismissedAt ?? Date.now()) + 6048e5 > Date.now()) {
                legacy_alerts.show({
                    title: 'Support Warning',
                    body:
                        // biome-ignore lint/style/useTemplate: I can't see the whole message when not doing concatenation
                        'Revenge does not officially support this build of Discord. Please update to a newer version as some features may not work as expected.\n\n' +
                        `Supported Builds: 250.0 (${MinimumSupportedBuildNumber}) or after\nYour Build: ${ClientInfoModule.Version} (${ClientInfoModule.Build})`,
                    confirmText: 'Remind me in 7 days',
                    onConfirm: () => {
                        storage.supportWarningDismissedAt = Date.now()
                        toasts.open({
                            key: 'revenge.toasts.support-warning.dismissed',
                            content: 'You will see this warning again in 7 days',
                            icon: assets.getIndexByName('ic_warning_24px'),
                        })
                    },
                })
            }
        },
    },
    true,
    // We do !> instead of < in case the value of the left is NaN
    () => !(Number(ClientInfoModule.Build) > MinimumSupportedBuildNumber),
)
