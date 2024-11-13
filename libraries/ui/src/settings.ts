import Libraries from '@revenge-mod/utils/library'

import type { ComponentType } from 'react'
import type { ImageURISource } from 'react-native'

export type RawRowConfig<CT extends ComponentType = ComponentType> = {
    title: () => string
    parent: string | null
    unsearchable?: boolean
    icon?: ImageURISource | number
    // IconComponent?: () => JSX.Element
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
    cachedRawCustomRowsInvalidated = true
    return () => delete customData.sections[section.name]
}

function createSettingsRoute(key: string, route: RouteRowConfig) {
    customData.rows[key] = route
    cachedRawCustomRowsInvalidated = true
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

let cachedRawCustomRowsInvalidated = false
let cachedRawCustomRows: Record<string, RawRowConfig>

export const getCustomRows = () => {
    if (!cachedRawCustomRowsInvalidated) return cachedRawCustomRows

    cachedRawCustomRowsInvalidated = false
    // OMG, UNBOUND REFERENCE????
    return (cachedRawCustomRows = [
        ...Object.values(customData.sections),
        { name: '(unbound)', settings: customData.rows },
    ]
        .map(section =>
            Object.entries(section.settings).reduce<Record<string, RawRowConfig>>((rows, [key, row]) => {
                rows[key] = transformRowToRawRow(key, row)
                return rows
            }, {}),
        )
        .reduce((rows, newRows) => Object.assign(rows, newRows), {}))
}

const transformRowToRawRow = (key: string, row: RowConfig): RawRowConfig => {
    return {
        title: () => row.label,
        parent: row.parent ?? null,
        icon: row.icon,
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
    }
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
