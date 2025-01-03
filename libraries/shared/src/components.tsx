import type { ReactNode } from 'react'

/**
 * Show a component if a condition is met, otherwise show a fallback. Inspired by SolidJS.
 */
export function Show({
    /**
     * The condition to check.
     */
    when,
    /**
     * The component to show if the condition is met.
     */
    children,
    /**
     * The fallback to show if the condition is not met.
     */
    fallback,
}: { when: unknown; fallback?: ReactNode; children: ReactNode }) {
    return when ? <>{children}</> : (fallback ?? null)
}
