import { discordIntl, intlModule, legacy_i18n } from '@revenge-mod/modules/common'

const intl = {
    // TODO: Migrate fully to @discord/intl
    string(key: string) {
        if (legacy_i18n[key]) return legacy_i18n[key]
        const messageGetter = intlModule.t[discordIntl.runtimeHashMessageKey(key)]
        if (!messageGetter) throw new Error(`Intl message key "${key}" does not exist`)
        return intlModule.intl.string(messageGetter)
    },
}

export default intl
