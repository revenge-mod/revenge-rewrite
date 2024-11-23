import { TableRowIcon, TableSwitchRow } from '@revenge-mod/modules/common/components'
import { registerPlugin } from '@revenge-mod/plugins/internals'
import { storageContextSymbol, useObservable } from '@revenge-mod/storage'
import { internal_addTableRowsToAdvancedSectionInRevengePage } from '../settings/pages/Revenge'

let originalValue: boolean
let isStaffSettingsShown = () => true

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
            if (exports.default?.constructor?.displayName === 'DeveloperExperimentStore') {
                exports.default = new Proxy(exports.default, {
                    get(target, property, receiver) {
                        if (property === 'isDeveloper') {
                            originalValue &&= Reflect.get(target, property, receiver)
                            return isStaffSettingsShown()
                        }

                        return Reflect.get(target, property, receiver)
                    },
                })
            }
        },
        beforeAppRender({ cleanup, storage, revenge: { assets } }) {
            cleanup(() => (isStaffSettingsShown = () => originalValue))

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
)
