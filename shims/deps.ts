import { findByProps } from '@revenge-mod/modules/finders'

export default {
    react: globalThis.React = findByProps('createElement')!,
    'react-native': globalThis.ReactNative = findByProps('AppRegistry')!,
    util: findByProps('inspect', 'isNullOrUndefined'),
    moment: findByProps('isMoment'),
    'chroma-js': findByProps('brewer'),
    lodash: findByProps('forEachRight'),
    '@shopify/react-native-skia': findByProps('useFont'),
}
