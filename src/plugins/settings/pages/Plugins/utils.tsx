import { filePicker, openAlert, toasts } from '@revenge-mod/modules/common'
import { AlertActionButton, AlertModal, IntlLink, Text } from '@revenge-mod/modules/common/components'
import { DownloadIcon } from '@revenge-mod/modules/common/components/icons'

import { InstallPluginResultMessage, installPlugin } from '@revenge-mod/plugins'
import { InstallPluginResult } from '@revenge-mod/plugins/constants'

const onPluginInstalled = () =>
    toasts.open({
        key: 'revenge.plugins.install.success',
        content: 'Plugin installed!',
        IconComponent: DownloadIcon,
    })

export async function installPluginFromStorage() {
    const result = await filePicker.handleDocumentSelection({ pickMultiple: false })

    const file = result?.[0]
    if (!file) return

    const res = await installPlugin(file.uri)
    if (!res) return onPluginInstalled()

    switch (res) {
        case InstallPluginResult.UnsignedUserConfirmationNeeded:
            return openAlert(
                'revenge.plugins.installation.unsigned',
                <AlertModal
                    title="Install unsigned plugin?"
                    content={
                        <Text color="text-muted">
                            The plugin you're trying to install is not signed. Are you sure you want to install it?{' '}
                            {/* TODO: Replace with actual link */}
                            <IntlLink target="https://palmdevs.me">Learn more about this feature.</IntlLink>
                        </Text>
                    }
                    actions={
                        <>
                            <AlertActionButton
                                variant="destructive"
                                text="Install anyway"
                                onPress={() => installPlugin(file.uri, true).then(onPluginInstalled)}
                            />
                            <AlertActionButton variant="secondary" text="Cancel" />
                        </>
                    }
                />,
            )
        default:
            return openAlert(
                'revenge.plugins.installation.failed',
                <AlertModal
                    title="Plugin installation failed"
                    content={InstallPluginResultMessage[res]}
                    actions={<AlertActionButton text="OK" />}
                />,
            )
    }
}
