import { findByProps } from '@revenge-mod/modules/finders'

const React = findByProps<typeof import('react')>('useEffect')!

export default React
