import { findProp } from '@revenge-mod/modules/finders'
import type * as TypedEmitter from 'typed-emitter'

export const EventEmitter: {
    new <T extends TypedEmitter.EventMap = TypedEmitter.EventMap>(): TypedEmitter.default<T>
} = findProp.lazy('EventEmitter')
export type EventEmitter<T extends TypedEmitter.EventMap = TypedEmitter.EventMap> = TypedEmitter.default<T>
