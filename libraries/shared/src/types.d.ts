export type Nullish = null | undefined
export type If<T, Then, Else> = T extends true ? Then : Else
// biome-ignore lint/suspicious/noExplicitAny: shuddhup
export type AnyObject = Record<any, any>
export type Nullable<T> = T | undefined
