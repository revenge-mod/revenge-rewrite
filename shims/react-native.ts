import { findByProps } from '@revenge-mod/modules/finders'

const ReactNative = findByProps<typeof import('react-native')>('AppRegistry')!

export default ReactNative
