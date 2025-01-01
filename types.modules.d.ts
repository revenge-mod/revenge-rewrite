// Module import types
// This was gonna originally be in the types.scoped.d.ts file, but TS sucks and won't allow both at the same time

declare module '*.webp' {
    const src: string
    export = src
}

declare module '@revenge-mod/modules/finders' {
    // We need this line for some reason...
    const finders: import('./libraries/modules/src/finders')
    export * from './libraries/modules/src/finders'
}

declare module '@revenge-mod/preferences' {
    const preferences: typeof import('./libraries/preferences/src/index')
    export * from './libraries/preferences/src/index'
    export default preferences
}

declare module '@revenge-mod/trust' {
    const preferences: typeof import('./libraries/trust/src/index')
    export * from './libraries/trust/src/index'
    export default preferences
}

declare module 'events' {
    const events: typeof import('./shims/events')
    export * from './shims/events'
}
