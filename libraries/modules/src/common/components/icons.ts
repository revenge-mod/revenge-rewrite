import { findProp } from '@revenge-mod/modules/finders'
import type { FC } from 'react'
import type { ImageProps } from 'react-native'

function wrapIcon(Comp: IconComponent) {
    return function IconElement(props?: IconComponentProps) {
        return Comp(props ?? {})
    }
}

export type IconComponent = FC<IconComponentProps>

export type IconComponentProps = {
    style?: ImageProps
    color?: string
}

export const CheckmarkLargeIcon = wrapIcon(findProp<IconComponent>('CheckmarkLargeIcon')!)
export const CopyIcon = wrapIcon(findProp<IconComponent>('CopyIcon')!)
export const DownloadIcon = wrapIcon(findProp<IconComponent>('DownloadIcon')!)
export const FolderIcon = wrapIcon(findProp<IconComponent>('FolderIcon')!)
