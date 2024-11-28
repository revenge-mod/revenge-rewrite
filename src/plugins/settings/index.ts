import { TableRowIcon } from '@revenge-mod/modules/common/components'
import { registerPlugin } from '@revenge-mod/plugins/internals'
import { sleep } from '@revenge-mod/utils/functions'
import { findInReactTree } from '@revenge-mod/utils/react'

import {
    type PressableRowConfig,
    type RawRowConfig,
    type RowConfig,
    type ToggleRowConfig,
    customData,
} from '@revenge-mod/ui/settings'

import RevengeIcon from '../../assets/revenge.webp'

import AboutSettingsPage from './pages/About'
import CustomPageRenderer from './pages/CustomPageRenderer'
import RevengeSettingsPage from './pages/Revenge'

import type { FC } from 'react'

registerPlugin(
    {
        name: 'Settings',
        author: 'The Revenge Team',
        description: 'Settings menus for Revenge',
        id: 'revenge.settings',
        version: '1.0.0',
        icon: 'SettingsIcon',
        async afterAppRender({
            patcher,
            revenge: {
                assets,
                modules,
                ui: { settings: sui },
            },
        }) {
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
                },
            })

            sui.createRoute('RevengeAbout', {
                type: 'route',
                label: 'About',
                component: AboutSettingsPage,
                icon: assets.getIndexByName('CircleInformationIcon'),
            })

            sui.createRoute('RevengeCustomPage', {
                type: 'route',
                label: 'Revenge Page',
                unsearchable: true,
                component: CustomPageRenderer,
                predicate: () => false,
            })

            // Wait single tick
            await sleep(0)

            const SettingsConstants = modules.findByProps('SETTING_RENDERER_CONFIG')!
            const SettingsOverviewScreen = modules.findByName<FC, false>('SettingsOverviewScreen', false)!

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

            patcher.after(
                SettingsOverviewScreen,
                'default',
                (_, children) => {
                    const registeredCustomRows = new Set(
                        Object.values(customData.sections).flatMap(({ settings }) => Object.keys(settings)),
                    )

                    const { sections } = findInReactTree(
                        children as Extract<typeof children, { props: unknown }>,
                        i => i.props?.sections,
                    ).props as {
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
        IconComponent: row.icon ? () => TableRowIcon({ source: row.icon! }) : undefined,
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
