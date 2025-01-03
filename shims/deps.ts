const lazyFindByProps = (...props: string[]) => {
    const { findByProps } = require('@revenge-mod/modules/finders')
    return findByProps(...props)
}

export default {
    react: () => (globalThis.React = lazyFindByProps('createElement')!),
    'react-native': () => (globalThis.ReactNative = lazyFindByProps('AppRegistry')!),
    util: () => lazyFindByProps('inspect', 'isNullOrUndefined'),
    moment: () => lazyFindByProps('isMoment'),
    'chroma-js': () => lazyFindByProps('brewer'),
    lodash: () => lazyFindByProps('forEachRight'),
    '@shopify/react-native-skia': () => lazyFindByProps('useFont'),
}
