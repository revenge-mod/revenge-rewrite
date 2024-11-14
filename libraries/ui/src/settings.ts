import Libraries from '@revenge-mod/utils/library'

import type { ComponentType } from 'react'
import type { ImageURISource } from 'react-native'

export type RawRowConfig<CT extends ComponentType = ComponentType> = {
    title: () => string
    parent: string | null
    unsearchable?: boolean
    /** @deprecated Since 256.5 */
    icon?: ImageURISource | number
    IconComponent?: () => JSX.Element
    usePredicate?: () => boolean
    useTrailing?: () => string | JSX.Element
    useDescription?: () => string
    useIsDisabled?: () => boolean
} & (
    | {
          type: 'pressable'
          onPress?: () => void
      }
    | {
          type: 'toggle'
          useValue?: () => boolean
          onValueChange?: (value: boolean) => void
      }
    | {
          type: 'route'
          screen: { route: string; getComponent(): CT }
      }
)

export type BaseRowConfig = {
    icon?: ImageURISource | number
    label: string
    description?: string
    trailing?: string | JSX.Element
    unsearchable?: boolean
    disabled?: boolean
    predicate?: () => boolean
    parent?: string
}

export type PressableRowConfig = BaseRowConfig & {
    type: 'pressable'
    onPress: () => unknown
}

export type ToggleRowConfig = BaseRowConfig & {
    type: 'toggle'
    value: boolean
    onValueChange: (value: boolean) => unknown
}

export type RouteRowConfig<CT extends ComponentType<any> = ComponentType<any>> = BaseRowConfig & {
    type: 'route'
    component: CT
}

export type RowConfig = PressableRowConfig | ToggleRowConfig | RouteRowConfig

function createSettingsSection(section: (typeof customData.sections)[string]) {
    if (section.name in customData.sections)
        throw new Error(`The settings section with the name "${section.name}" already exists`)
    customData.sections[section.name] = section
    return () => delete customData.sections[section.name]
}

function createSettingsRoute(key: string, route: RouteRowConfig) {
    customData.rows[key] = route
    return () => delete customData.rows[key]
}

function addSettingsRowsToSection(name: string, rows: Record<string, RowConfig>) {
    if (!(name in customData.sections)) throw new Error(`No setting section exists with the name "${name}"`)
    const section = customData.sections[name]
    Object.assign(section!.settings, rows)
    return () => {
        for (const key in rows) delete section!.settings[key]
    }
}

export const customData = {
    sections: {} as {
        [K: string]: {
            name: string
            settings: Record<string, RowConfig>
        }
    },
    rows: {} as Record<string, RowConfig>,
}

export const SettingsUILibrary = Libraries.create(
    {
        name: 'ui.settings',
        uses: [],
    },
    () => {
        return {
            addRowsToSection: addSettingsRowsToSection,
            createSection: createSettingsSection,
            createRoute: createSettingsRoute,
        }
    },
)

export type SettingsUILibrary = ReturnType<(typeof SettingsUILibrary)['new']>
