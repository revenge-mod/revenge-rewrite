export const PerformanceTimes = {
    Native_RequiredIndex: -1,
    Init_Initialize: -1,
    Modules_TriedRestoreCache: -1,
    Modules_HookedFactories: -1,
    Modules_IndexRequired: -1,
    Init_PromiseResolved: -1,
    Modules_RequiredAssets: -1,
    Storage_Initialized: -1,
    Plugins_CoreImported: -1,
    Plugins_CoreStarted: -1,
    App_CreateElementCalled: -1,
    App_BeforeRunCallbacks: -1,
    App_AfterRunCallbacks: -1,
}

export function timeOf(time: keyof typeof PerformanceTimes) {
    return timestampOf(time) - PerformanceTimes.Native_RequiredIndex
}

export function timestampOf(time: keyof typeof PerformanceTimes) {
    const timestamp = PerformanceTimes[time]
    if (timestamp === -1) return Number.NaN
    return timestamp
}

export function recordTimestamp(time: keyof typeof PerformanceTimes) {
    return (PerformanceTimes[time] = nativePerformanceNow())
}