import { Stack } from '@revenge-mod/modules/common/components'
import { ScrollView, StyleSheet, View } from 'react-native'

import type { ReactNode } from 'react'

const styles = StyleSheet.create({
    growable: {
        flexGrow: 1,
    },
    resizable: {
        flex: 1,
    },
    paddedContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
})

// Hacky way to allow dismissing input fields when tapping outside of them
// But also not allowing the ScrollView to scroll
export default function PageWrapper(props: { children: ReactNode }) {
    return (
        <View style={styles.growable}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.resizable}>
                <Stack style={[styles.paddedContainer, styles.resizable]} spacing={16} direction="vertical">
                    {props.children}
                </Stack>
            </ScrollView>
        </View>
    )
}
