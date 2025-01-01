export type Nullish = null | undefined
export type If<T, Then, Else> = T extends true ? Then : Else
export type AnyObject = Record<any, any>
export type Nullable<T> = T | undefined
