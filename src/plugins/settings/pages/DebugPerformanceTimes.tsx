import { PerformanceTimes, deltaTimeOf, timestampTimeOf } from '@revenge-mod/debug'
import { TableRow, Text } from '@revenge-mod/modules/common/components'

const PerformanceTimesKeys = (Object.keys(PerformanceTimes) as (keyof typeof PerformanceTimes)[]).sort(
    (a, b) => deltaTimeOf(a) - deltaTimeOf(b),
)

export default function DebugPerformanceTimesSettingsPage() {
    let previousTimestamp: number

    return (
        <>
            <Text color="text-danger">
                Some delta times may be inaccurate as some steps run concurrently to each other. Only look at delta
                times when necessary. Steps that are marked in red were not skipped/not recorded.
            </Text>
            {PerformanceTimesKeys.map(key => {
                const deltaNumber = deltaTimeOf(key)
                previousTimestamp ??= timestampTimeOf(key)

                const delta = deltaNumber.toFixed(4)
                const deltaLastStep = (timestampTimeOf(key) - previousTimestamp).toFixed(4)

                if (!Number.isNaN(deltaNumber)) previousTimestamp = timestampTimeOf(key)

                return (
                    // biome-ignore lint/correctness/useJsxKeyInIterable: This never gets rerendered
                    <TableRow
                        variant={Number.isNaN(deltaNumber) ? 'danger' : 'default'}
                        label={key}
                        subLabel={`${delta}ms (Δ: ${deltaLastStep}ms)`}
                    />
                )
            })}
        </>
    )
}
