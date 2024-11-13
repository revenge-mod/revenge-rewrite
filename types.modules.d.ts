// Module import types
// This was gonna originally be in the types.scoped.d.ts file, but TS sucks and won't allow both at the same time

declare module '*.png' {
    const src: string
    export = src
}
