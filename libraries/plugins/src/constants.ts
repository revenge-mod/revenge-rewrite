import type { InternalPluginDefinition } from './internals'

export const PluginIdRegex = /^[a-z0-9-_\.]{1,128}$/

export const WhitelistedPluginObjectKeys = [
    'description',
    'disable',
    'icon',
    'id',
    'name',
    'version',
    'stop',
    'author',
    'errors',
] as const satisfies ReadonlyArray<keyof InternalPluginDefinition>

export const PluginStatus = {
    Stopped: 1,
    Fetching: 2,
    Starting: 3,
    Started: 4,
}
