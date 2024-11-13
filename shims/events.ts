// TODO: Fix this path
import { findProp } from 'libraries/modules/src/finders'
import type TypedEmitter from 'typed-emitter'
import type { EventMap } from 'typed-emitter'

export const EventEmitter: { new <T extends EventMap = EventMap>(): TypedEmitter<T> } = findProp.lazy('EventEmitter')
export type EventEmitter<T extends EventMap = EventMap> = TypedEmitter<T>
