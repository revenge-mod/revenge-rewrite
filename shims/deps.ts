const findByProps = (...props: string[]) => {
    const { find } = require('@revenge-mod/modules/finders')
    const { byProps } = require('@revenge-mod/modules/filters')
    return find(byProps(...props))
}

export default {
    react: () => (globalThis.React = findByProps('createElement')!),
    'react-native': () => (globalThis.ReactNative = findByProps('AppRegistry')!),
    util: () => findByProps('inspect', 'isNullOrUndefined'),
    moment: () => findByProps('isMoment'),
    'chroma-js': () => findByProps('brewer'),
    lodash: () => findByProps('forEachRight'),
    '@shopify/react-native-skia': () => findByProps('useFont'),
    '@shopify/flash-list': () => findByProps('FlashList'),
}
