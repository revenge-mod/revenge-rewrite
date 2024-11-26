import { PerformanceTimes, timeOf, timestampOf } from '@revenge-mod/debug'
import { TableRow, Text } from '@revenge-mod/modules/common/components'

import PageWrapper from '../../../plugins/settings/pages/(Wrapper)'

const PerformanceTimesKeys = (Object.keys(PerformanceTimes) as (keyof typeof PerformanceTimes)[]).sort(
    (a, b) => timeOf(a) - timeOf(b),
)

export default function DebugPerformanceTimesSettingsPage() {
    let previousTimestamp: number

    return (
        <PageWrapper>
            <Text color="text-danger">
                Some delta times may be inaccurate as some steps run concurrently to each other. Only look at delta
                times when necessary. Steps that are marked in red were skipped/not recorded.
            </Text>
            {PerformanceTimesKeys.map(key => {
                const timeNumber = timeOf(key)
                previousTimestamp ??= timestampOf(key)

                const time = timeNumber.toFixed(4)
                const delta = (timestampOf(key) - previousTimestamp).toFixed(4)

                if (!Number.isNaN(timeNumber)) previousTimestamp = timestampOf(key)

                return (
                    // biome-ignore lint/correctness/useJsxKeyInIterable: This never gets rerendered
                    <TableRow
                        variant={Number.isNaN(timeNumber) ? 'danger' : 'default'}
                        label={key}
                        subLabel={`${time}ms (Δ: ${delta}ms)`}
                    />
                )
            })}
        </PageWrapper>
    )
}
