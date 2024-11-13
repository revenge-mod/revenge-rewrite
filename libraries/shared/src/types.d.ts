/**
 * @internal
 */
export type Nullish = null | undefined
/**
 * @internal
 */
export type If<T, Then, Else> = T extends true ? Then : Else
/**
 * @internal
 */
export type AnyObject = Record<any, any>
