import { clipboard, createStyles } from '@revenge-mod/modules/common'
import { Button, Card, SafeAreaView, Text } from '@revenge-mod/modules/common/components'
import { ClientInfoModule } from '@revenge-mod/modules/native'
import { SemanticColor } from '@revenge-mod/ui/colors'
import { getErrorStack } from '@revenge-mod/utils/errors'

import { ScrollView, StyleSheet, View } from 'react-native'

import type { ComponentProps } from 'react'

const useErrorBoundaryStyles = createStyles({
    view: {
        backgroundColor: SemanticColor.BG_BASE_SECONDARY,
        paddingHorizontal: 16,
        paddingVertical: 24,
        flex: 1,
        gap: 16,
    },
})

const styles = StyleSheet.create({
    nestedView: {
        gap: 8,
        flex: 1,
    },
    headerText: {
        flexGrow: 1,
    },
})

export default function ErrorBoundaryScreen(props: {
    error: (Error & { componentStack?: string }) | unknown
    rerender: () => void
    reload: () => void
}) {
    const errorBoundaryStyles = useErrorBoundaryStyles()
    const error = props.error

    return (
        <SafeAreaView style={errorBoundaryStyles.view}>
            <View style={{ gap: 4 }}>
                <Text variant="display-lg">Error!</Text>
                <Text variant="text-md/normal">
                    An error was thrown while rendering components. This could be caused by plugins, Revenge or Discord.{' '}
                    {Math.floor((Number(ClientInfoModule.Build) % 1000) / 100) > 0 ? (
                        <Text variant="text-md/normal" color="text-danger">
                            You are not on a stable version of Discord which may explain why you are experiencing this
                            issue.
                        </Text>
                    ) : null}
                </Text>
                <Text variant="text-sm/normal" color="text-muted">
                    {ClientInfoModule.Version} ({ClientInfoModule.Build}) • Revenge {__REVENGE_RELEASE__} (
                    {__REVENGE_HASH__}
                    {__REVENGE_HASH_DIRTY__ ? '-dirty' : ''})
                </Text>
            </View>
            <LabeledCard label="Error" rawContent={getErrorStack(error)}>
                <Text variant="text-md/medium">{String(error)}</Text>
                {error instanceof Error && error.stack && (
                    <>
                        <Text variant="heading-xl/semibold">Call Stack</Text>
                        <ScrollView style={styles.nestedView} fadingEdgeLength={64}>
                            {parseStackTrace(error.stack?.slice(String(error).length + 1)).map(
                                ({ at, file, line, column }) => (
                                    // biome-ignore lint/correctness/useJsxKeyInIterable: This never gets rerendered
                                    <Text
                                        variant="heading-md/extrabold"
                                        style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                                    >
                                        {at}
                                        {'\n'}
                                        <Text
                                            variant="text-sm/medium"
                                            style={{ fontFamily: 'monospace' }}
                                            color="text-muted"
                                        >
                                            {file}
                                            {typeof line === 'number' && typeof column === 'number' && (
                                                <>
                                                    :{line}:{column}
                                                </>
                                            )}
                                        </Text>
                                    </Text>
                                ),
                            )}
                        </ScrollView>
                    </>
                )}
            </LabeledCard>
            {error instanceof Error && 'componentStack' in error && (
                <LabeledCard
                    scrollable
                    label="Component Stack"
                    style={{ flex: 1 }}
                    rawContent={error.componentStack as string}
                >
                    <Text selectable variant="text-md/medium">
                        {...(error.componentStack as string)
                            .slice(1)
                            .split('\n')
                            // biome-ignore lint/correctness/useJsxKeyInIterable: This never gets rerendered
                            .map(line => ['<', <Text variant="text-md/bold">{line.slice(7)}</Text>, '/>\n'])}
                    </Text>
                </LabeledCard>
            )}
            <Card style={{ gap: 16, flexDirection: 'row' }}>
                <Button style={{ flex: 1 }} variant="destructive" text="Reload Discord" onPress={props.reload} />
                <Button style={{ flex: 1 }} text="Retry Render" onPress={props.rerender} />
            </Card>
        </SafeAreaView>
    )
}

export type LabeledCardProps = ComponentProps<typeof Card> & {
    label: string
    rawContent?: string
    scrollable?: boolean
}

export function LabeledCard(props: LabeledCardProps) {
    const ViewComponent = props.scrollable ? ScrollView : View

    return (
        <Card {...props} style={[styles.nestedView, ...(Array.isArray(props.style) ? props.style : [props.style])]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="heading-xl/semibold" style={styles.headerText}>
                    {props.label}
                </Text>
                {props.rawContent && (
                    <Button
                        variant="secondary"
                        size="sm"
                        text="Copy"
                        onPress={() => clipboard.setString(props.rawContent as string)}
                    />
                )}
            </View>
            <ViewComponent style={styles.nestedView} fadingEdgeLength={32}>
                {props.children}
            </ViewComponent>
        </Card>
    )
}

interface StackFrame {
    at: string
    file: string
    line: number | null
    column: number | null
}

const IndexBundleFilePath = (HermesInternal as HermesInternalObject).getFunctionLocation(__r).fileName
const StackFrameRegex = /at (.+) \(([^:]+):(\d+):(\d+)\)|at (.+)? \(([^)]+)\)/

function parseStackTrace(stackTrace: string): StackFrame[] {
    const frames: StackFrame[] = []
    const lines = stackTrace.split('\n')

    for (const line of lines) {
        const match = StackFrameRegex.exec(line.trim())

        if (match) {
            let at: string
            let path: string
            let ln: number | null = null
            let col: number | null = null

            if (match[3] && match[4]) {
                // Case where line and column numbers are present
                at = match[1]!
                path = match[2]!
                ln = Number(match[3])
                col = Number(match[4])
            } else {
                // Case where line and column numbers are missing (native functions or just file path)
                at = match[5]!
                path = match[6]!
            }

            if (path === IndexBundleFilePath) path = '(Discord)'

            frames.push({
                at: at,
                file: path,
                line: ln,
                column: col,
            })
        } else {
            // For lines that don't match the expected format
            frames.push({
                at: 'UNABLE TO PARSE LINE',
                file: line,
                line: null,
                column: null,
            })
        }
    }

    return frames
}
