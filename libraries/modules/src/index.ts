import Libraries from '@revenge-mod/utils/library'

import * as constants from './constants'
import * as filters from './filters'
import * as finders from './finders'
import * as metro from './metro'

export const ModulesLibrary = Libraries.create(
    {
        name: 'modules',
        uses: ['logger', 'patcher'],
    },
    async () => {
        await metro.initializeModules()

        const common = await import('./common')
        const native = await import('./native')

        return {
            constants,
            common,
            filters,
            native,
            metro,
            ...finders,
        }
    },
)

export { constants }

export type ModulesLibrary = Awaited<ReturnType<(typeof ModulesLibrary)['new']>>

export type * from './types'
