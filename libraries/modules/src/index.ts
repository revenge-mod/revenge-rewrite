import * as constants from './constants'
import * as filters from './filters'
import * as finders from './finders'
import * as metro from './metro'

export async function createModulesLibrary() {
    await metro.initializeModules()

    const common = await import('./common')
    const native = await import('./native')

    return {
        common,
        filters,
        native,
        metro,
        ...finders,
    }
}

export { constants }

export type ModulesLibrary = Awaited<ReturnType<typeof createModulesLibrary>>

export type * from './types'
