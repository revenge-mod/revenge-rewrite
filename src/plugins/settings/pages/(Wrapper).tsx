import { ScrollView } from 'react-native'
import type { ReactNode } from 'react'

export default function PageWrapper(props: { children: ReactNode }) {
    return <ScrollView keyboardShouldPersistTaps="handled">{props.children}</ScrollView>
}
