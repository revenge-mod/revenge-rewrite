export function noop() {}
export async function noopPromise() {}
export const objectSeal = Object.seal
export const objectFreeze = Object.freeze
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
