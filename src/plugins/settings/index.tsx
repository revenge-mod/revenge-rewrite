import { findInReactTree } from '@revenge-mod/utils/react'
// TODO: Fix this path
import { registerPlugin } from 'libraries/plugins/src/internals'

import { TableRowIcon } from '@revenge-mod/modules/common/components'
import { settings } from '@revenge-mod/settings'
import { type RawRowConfig, customData, getCustomRows } from '@revenge-mod/ui/settings'
import RevengeIcon from '../../assets/revenge.png'
import AboutSettingsPage from './pages/About'
import DeveloperSettingsPage from './pages/Developer'
import RevengeSettingsPage from './pages/Revenge'

registerPlugin(
    {
        name: 'Settings',
        author: 'The Revenge Team',
        description: 'Settings menus for Revenge',
        id: 'revenge.settings',
        version: '1.0.0',
        icon: 'WarningIcon',
        afterAppRender({
            patcher,
            cleanup,
            revenge: {
                assets,
                modules,
                ui: { settings: sui },
            },
        }) {
            const SettingsConstants = modules.findByProps.lazy('SETTING_RENDERER_CONFIG')
            const SettingsOverviewScreen = modules.findByName.lazy('SettingsOverviewScreen', false)

            const originalRendererConfig = SettingsConstants.SETTING_RENDERER_CONFIG as Record<string, RawRowConfig>
            let rendererConfig = originalRendererConfig

            Object.defineProperty(SettingsConstants, 'SETTING_RENDERER_CONFIG', {
                enumerable: true,
                configurable: true,
                get: () =>
                    ({
                        ...getCustomRows(),
                        ...rendererConfig,
                    }) satisfies Record<string, RawRowConfig>,
                set: v => (rendererConfig = v),
            })

            cleanup(() => {
                Object.defineProperty(SettingsConstants, 'SETTING_RENDERER_CONFIG', {
                    value: originalRendererConfig,
                    writable: true,
                    get: undefined,
                    set: undefined,
                })
            })

            patcher.after(
                SettingsOverviewScreen,
                'default',
                (_, children) => {
                    const registeredCustomRows = new Set(
                        Object.values(customData.sections).flatMap(({ settings }) => Object.keys(settings)),
                    )

                    const { sections } = findInReactTree(children, i => i.props?.sections).props as {
                        sections: Array<{ label: string; settings: string[] }>
                    }

                    // This means we've already spliced new sections
                    if (
                        sections.findIndex(section =>
                            section.settings.some(setting => registeredCustomRows.has(setting)),
                        ) !== -1
                    )
                        return

                    let index = -~sections.findIndex(section => section.settings.includes('ACCOUNT')) || 1

                    for (const key in customData.sections) {
                        const section = customData.sections[key]!
                        sections.splice(index++, 0, {
                            label: section.name,
                            settings: Object.keys(section.settings),
                        })
                    }
                },
                'addNewSettingsSections',
            )

            cleanup(
                sui.createSection({
                    name: 'Revenge',
                    settings: {
                        Revenge: {
                            type: 'route',
                            label: 'Revenge',
                            icon: {
                                uri: RevengeIcon,
                            },
                            component: RevengeSettingsPage,
                        },
                        RevengeDeveloper: {
                            type: 'route',
                            label: 'Developer',
                            icon: assets.getIndexByName('WrenchIcon'),
                            component: DeveloperSettingsPage,
                            predicate: () => settings.developerSettingsEnabled,
                        },
                    },
                }),
                sui.createRoute('RevengeAbout', {
                    type: 'route',
                    label: 'About',
                    component: AboutSettingsPage,
                    icon: assets.getIndexByName('CircleInformationIcon'),
                }),
            )
        },
    },
    true,
)
