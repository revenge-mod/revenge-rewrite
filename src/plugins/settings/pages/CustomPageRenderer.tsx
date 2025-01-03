import { NavigationNative, type NavigationNativeStackNavigationParamList } from '@revenge-mod/modules/common'
import type { StackScreenProps } from '@react-navigation/stack'

export default function CustomPageRenderer() {
    const navigation = NavigationNative.useNavigation()
    const route =
        NavigationNative.useRoute<StackScreenProps<NavigationNativeStackNavigationParamList, 'RevengeCustomPage'>['route']>()

    const { render: PageComponent, ...args } = route.params

    // biome-ignore lint/correctness/useExhaustiveDependencies: We only want to do this once
    React.useEffect(() => void navigation.setOptions({ ...args }), [])

    return <PageComponent />
}
