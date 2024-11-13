/**
 * Symbol used to store a library's patcher instance in case it needs to be destroyed
 * @internal
 */
export const libraryPatcherSymbol = Symbol.for('revenge.shared.libraryPatcher')

/**
 * Symbol used to access internal properties
 * @internal
 */
export const internalSymbol = Symbol.for('revenge.shared.interal')
