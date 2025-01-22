const findByProps = (...props: string[]) => {
    const { find } = require('@revenge-mod/modules/finders')
    const { byProps } = require('@revenge-mod/modules/filters')
    return find(byProps(...props))
}

const findByPropsEager = (...props: string[]) => {
    const { findEager } = require('@revenge-mod/modules/finders')
    const { byProps } = require('@revenge-mod/modules/filters')
    return findEager(byProps(...props))
}

export default {
    react: () => findByPropsEager('createElement')!,
    'react-native': () => findByPropsEager('AppRegistry')!,
    lodash: () => findByProps('forEachRight'),
    '@shopify/flash-list': () => findByProps('FlashList'),
}
