import type { RouteRowConfig, RowConfig } from './settings.types'

export type * from './settings.types'

export const customData = {
    sections: {} as {
        [K: string]: {
            name: string
            settings: Record<string, RowConfig>
        }
    },
    rows: {} as Record<string, RowConfig>,
}

export const SettingsUILibrary = {
    addRowsToSection: addSettingsRowsToSection,
    createSection: createSettingsSection,
    createRoute: createSettingsRoute,
}

export type SettingsUILibrary = typeof SettingsUILibrary

function createSettingsSection(section: (typeof customData.sections)[string]) {
    if (customData.sections[section.name])
        throw new Error(`The settings section with the name "${section.name}" already exists`)
    customData.sections[section.name] = section
    return () => delete customData.sections[section.name]
}

function createSettingsRoute(key: string, route: RouteRowConfig) {
    customData.rows[key] = route
    return () => delete customData.rows[key]
}

function addSettingsRowsToSection(name: string, rows: Record<string, RowConfig>) {
    if (!customData.sections[name]) throw new Error(`No setting section exists with the name "${name}"`)
    const section = customData.sections[name]
    Object.assign(section!.settings, rows)
    return () => {
        for (const key in rows) delete section!.settings[key]
    }
}
