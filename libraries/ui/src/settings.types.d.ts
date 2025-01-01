import type { ComponentType, ReactNode } from 'react'
import type { ImageSourcePropType } from 'react-native'

export type RawRowConfig<CT extends ComponentType = ComponentType> = {
    title: () => string
    parent: string | null
    unsearchable?: boolean
    /** @deprecated Since 256.5 */
    icon?: ImageSourcePropType
    IconComponent?: () => ReactNode
    usePredicate?: () => boolean
    useTrailing?: () => ReactNode
    useDescription?: () => string
    useIsDisabled?: () => boolean
} & (
    | {
          type: 'pressable'
          onPress?: () => void
      }
    | {
          type: 'toggle'
          useValue?: () => boolean
          onValueChange?: (value: boolean) => void
      }
    | {
          type: 'route'
          screen: { route: string; getComponent(): CT }
      }
)

export type BaseRowConfig = {
    icon?: ImageSourcePropType
    label: string
    description?: string
    trailing?: string | JSX.Element
    unsearchable?: boolean
    disabled?: boolean
    predicate?: () => boolean
    parent?: string
}

export type PressableRowConfig = BaseRowConfig & {
    type: 'pressable'
    onPress: () => unknown
}

export type ToggleRowConfig = BaseRowConfig & {
    type: 'toggle'
    value: boolean
    onValueChange: (value: boolean) => unknown
}

export type RouteRowConfig<CT extends ComponentType<any> = ComponentType<any>> = BaseRowConfig & {
    type: 'route'
    component: CT
}

export type RowConfig = PressableRowConfig | ToggleRowConfig | RouteRowConfig
