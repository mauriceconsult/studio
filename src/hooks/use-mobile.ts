import * as React from "react"

const MOBILE_BREAKPOINT = 1024

export function useIsMobile() {
  const getSnapshot = React.useCallback(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < MOBILE_BREAKPOINT
  }, [])

  const subscribe = React.useCallback((callback: () => void) => {
    if (typeof window === "undefined") return () => {}

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => callback()

    mediaQuery.addEventListener("change", onChange)
    return () => mediaQuery.removeEventListener("change", onChange)
  }, [])

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
