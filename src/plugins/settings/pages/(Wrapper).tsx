import type { ReactNode } from 'react'
import { ScrollView } from 'react-native'

export default function PageWrapper(props: { children: ReactNode }) {
    return <ScrollView keyboardShouldPersistTaps="handled">{props.children}</ScrollView>
}
