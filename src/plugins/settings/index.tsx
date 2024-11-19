import { findInReactTree } from '@revenge-mod/utils/react'
// TODO: Fix this path
import { registerPlugin } from 'libraries/plugins/src/internals'

import { TableRowIcon } from '@revenge-mod/modules/common/components'
import {
    type PressableRowConfig,
    type RawRowConfig,
    type RowConfig,
    type ToggleRowConfig,
    customData,
} from '@revenge-mod/ui/settings'
import { settings } from 'libraries/preferences/src'

import RevengeIcon from '../../assets/revenge.webp'

import AboutSettingsPage from './pages/About'
import CustomPageRenderer from './pages/CustomPageRenderer'
import DebugPerformanceTimesSettingsPage from './pages/DebugPerformanceTimes'
import DeveloperSettingsPage from './pages/Developer'
import RevengeSettingsPage from './pages/Revenge'

registerPlugin(
    {
        name: 'Settings',
        author: 'The Revenge Team',
        description: 'Settings menus for Revenge',
        id: 'revenge.settings',
        version: '1.0.0',
        icon: 'SettingsIcon',
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
                sui.createRoute('RevengeDebugPerformanceTimes', {
                    type: 'route',
                    label: 'Debug Performance Times',
                    component: DebugPerformanceTimesSettingsPage,
                    icon: assets.getIndexByName('TimerIcon'),
                }),
                sui.createRoute('RevengeCustomPage', {
                    type: 'route',
                    label: 'Revenge Page',
                    unsearchable: true,
                    component: CustomPageRenderer,
                    predicate: () => false,
                }),
            )
        },
    },
    true,
)

export const getCustomRows = () => {
    // OMG, UNBOUND REFERENCE????
    return [...Object.values(customData.sections), { name: '(unbound)', settings: customData.rows }]
        .map(section =>
            Object.entries(section.settings).reduce<Record<string, RawRowConfig>>((rows, [key, row]) => {
                rows[key] = transformRowToRawRow(key, row)
                return rows
            }, {}),
        )
        .reduce((rows, newRows) => Object.assign(rows, newRows), {})
}

const transformRowToRawRow = (key: string, row: RowConfig): RawRowConfig => {
    return {
        title: () => row.label,
        parent: row.parent ?? null,
        icon: row.icon,
        IconComponent: () => TableRowIcon({ source: row.icon }),
        unsearchable: row.unsearchable,
        screen:
            row.type === 'route'
                ? {
                      route: key,
                      getComponent: () => row.component,
                  }
                : undefined!,
        onPress: (row as PressableRowConfig).onPress,
        useDescription: row.description ? () => row.description! : undefined,
        useTrailing: row.trailing ? () => row.trailing! : undefined,
        useIsDisabled: typeof row.disabled === 'boolean' ? () => row.disabled! : undefined,
        usePredicate: row.predicate,
        onValueChange: (row as ToggleRowConfig).onValueChange,
        useValue: () => (row as ToggleRowConfig).value,
        type: row.type,
    } satisfies RawRowConfig
}
