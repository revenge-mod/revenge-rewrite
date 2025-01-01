import type { Metro } from '@revenge-mod/modules'

type WrappableName = 'after' | 'before' | 'instead'
type UnpatchFunction = () => boolean

type SafeParameters<T> = T extends (...args: infer P) => any ? P : any[]

type KeysWithFunctionValues<T extends AnyObject> = {
    // biome-ignore lint/complexity/noBannedTypes: Would you shut up please?
    [K in Extract<keyof T, string>]: T[K] extends Function ? K : never
}[Extract<keyof T, string>]

type WrappableParams<N extends WrappableName, Parent extends AnyObject, Name extends KeysWithFunctionValues<Parent>> = [
    /**
     * The parent object to patch
     */
    parent: Parent,
    /**
     * The name of the function to patch
     */
    name: Name,
    /**
     * The callback to run when the function is called
     * - `before` will run before the original function, you can optionally return a new set of arguments
     * - `after` will run after the original function, you can optionally return a new return value
     * - `instead` will run instead of the original function
     */
    callback: N extends 'before'
        ? (
              this: Parent,
              /**
               * The arguments passed to the function
               */
              args: SafeParameters<Parent[Name]>,
          ) => SafeParameters<Parent[Name]> | void
        : N extends 'after'
          ? (
                this: Parent,
                /**
                 * The arguments passed to the function
                 */
                args: SafeParameters<Parent[Name]>,
                /**
                 * The return value of the function
                 */
                returnValue: ReturnType<Parent[Name]>,
            ) => ReturnType<Parent[Name]> | void
          : N extends 'instead'
            ? (
                  this: Parent,
                  /**
                   * The arguments passed to the function
                   */
                  args: SafeParameters<Parent[Name]>,
                  /**
                   * The original function
                   */
                  originalFunction: Parent[Name],
              ) => void
            : never,
    /**
     * A key to use for debugging
     */
    debugKey?: string,
]

type AwaitedWrappableParams<
    N extends WrappableName,
    Parent extends Promise<AnyObject>,
    Name extends KeysWithFunctionValues<Awaited<Parent>>,
> = [
    /**
     * The parent object to patch
     */
    parent: Parent,
    /**
     * The name of the function to patch
     */
    name: Name,
    /**
     * The callback to run when the function is called
     * - `before` will run before the original function, you can optionally return a new set of arguments
     * - `after` will run after the original function, you can optionally return a new return value
     * - `instead` will run instead of the original function
     */
    callback: N extends 'before'
        ? (
              this: Awaited<Parent>,
              /**
               * The arguments passed to the function
               */
              args: SafeParameters<Awaited<Parent>[Name]>,
          ) => SafeParameters<Awaited<Parent>[Name]> | void
        : N extends 'after'
          ? (
                this: Awaited<Parent>,
                /**
                 * The arguments passed to the function
                 */
                args: SafeParameters<Awaited<Parent>[Name]>,
                /**
                 * The return value of the function
                 */
                returnValue: ReturnType<Awaited<Parent>[Name]>,
            ) => ReturnType<Awaited<Parent>[Name]> | void
          : N extends 'instead'
            ? (
                  this: Awaited<Parent>,
                  /**
                   * The arguments passed to the function
                   */
                  args: SafeParameters<Awaited<Parent>[Name]>,
                  /**
                   * The original function
                   */
                  originalFunction: Awaited<Parent>[Name],
              ) => void
            : never,
    /**
     * A key to use for debugging
     */
    debugKey?: string,
]

type AwaitedWrappable<N extends WrappableName> = <
    Parent extends Promise<AnyObject>,
    Name extends KeysWithFunctionValues<Awaited<Parent>>,
>(
    ...params: AwaitedWrappableParams<N, Parent, Name>
) => UnpatchFunction

type Wrappable<N extends WrappableName> = <Parent extends AnyObject, Name extends KeysWithFunctionValues<Parent>>(
    ...params: WrappableParams<N, Parent, Name>
) => UnpatchFunction

type OnceModuleLoadedCallback = (callback: (target: Metro.ModuleExports) => void) => unknown
