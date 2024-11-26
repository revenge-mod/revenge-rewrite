import type { ReactNode } from 'react'

export default function PageWrapper(props: { children: ReactNode }) {
    return <ReactNative.ScrollView keyboardShouldPersistTaps="handled">{props.children}</ReactNative.ScrollView>
}
