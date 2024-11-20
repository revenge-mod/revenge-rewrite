import { TableRowIcon, TableSwitchRow } from '@revenge-mod/modules/common/components'
import { createFilter } from '@revenge-mod/modules/filters'
import { storageContextSymbol, useObservable } from '@revenge-mod/storage'
// TODO: Fix this path
import { registerPlugin } from 'libraries/plugins/src/internals'
import { internal_addTableRowsToAdvancedSectionInRevengePage } from '../settings/pages/Revenge'

let patchedStore = false
let isStaffSettingsShown = () => true

// TODO: Fix Dev Widget not enabling
registerPlugin<{
    enabled: boolean
}>(
    {
        name: 'Staff Settings',
        author: 'The Revenge Team',
        description: 'Enables access to staff settings on Discord',
        id: 'revenge.staff-settings',
        version: '1.0.0',
        icon: 'ic_progress_wrench_24px',
        onMetroModuleLoad(_, exports) {
            if (!patchedStore && exports.default?.constructor?.displayName === 'DeveloperExperimentStore') {
                patchedStore = true
                exports.default = new Proxy(exports.default, {
                    get(target, property, receiver) {
                        if (property === 'isDeveloper') return isStaffSettingsShown()
                        return Reflect.get(target, property, receiver)
                    },
                })
            }
        },
        beforeAppRender({ storage, revenge: { assets } }) {
            isStaffSettingsShown = () => (storage[storageContextSymbol].ready ? storage.enabled : true)

            internal_addTableRowsToAdvancedSectionInRevengePage(() => {
                useObservable([storage])

                return (
                    <TableSwitchRow
                        label="Show Discord Staff Settings"
                        icon={<TableRowIcon source={assets.getIndexByName('ic_progress_wrench_24px')} />}
                        value={storage.enabled}
                        onValueChange={(v: boolean) => (storage.enabled = v)}
                    />
                )
            })
        },
        initializeStorage: () => ({ enabled: false }),
    },
    true,
    // () => false,
)

const byConstructorDisplayName = createFilter<[name: string]>(
    ([name], m) => m.constructor?.displayName === name,
    name => `revenge.plugins.staff-settings.byConstructorDisplayName(${name})`,
)
