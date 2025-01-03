import { registerPlugin } from '@revenge-mod/plugins/internals'

registerPlugin(
    {
        name: 'Staff Settings',
        author: 'Revenge',
        description: 'Enables access to staff settings on Discord',
        id: 'revenge.staff-settings',
        version: '1.0.0',
        icon: 'StaffBadgeIcon',
    },
    {
        onMetroModuleLoad(_, __, exports, unsub) {
            if (exports.default?.constructor?.displayName === 'DeveloperExperimentStore') {
                unsub()
                exports.default = new Proxy(exports.default, {
                    get(target, property, receiver) {
                        if (property === 'isDeveloper') return true

                        return Reflect.get(target, property, receiver)
                    },
                })
            }
        },
        beforeStop() {
            return { reloadRequired: true }
        },
    },
    {
        external: false,
        manageable: true,
        enabled: false,
    },
)
