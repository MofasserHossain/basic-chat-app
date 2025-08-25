'use client'

import style from './navigation-loading-indicator.module.css'
import clsx from 'clsx'
import { useLinkStatus } from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'

declare global {
  interface Window {
    startNavigationLoadingCallback?: () => () => void
  }
}

export function NavigationLoadingIndicator() {
  const [state, setState] = useState<'inactive' | 'loading' | 'done'>(
    'inactive',
  )
  const doneTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  )
  const [loadingPercentage, setLoadingPercentage] = useState(0)

  // Set the trigger listener when this component mounts - it should only be mounted once per page!
  useEffect(() => {
    const pendingEvents = new Set<symbol>()
    window.startNavigationLoadingCallback = () => {
      const event = Symbol()
      pendingEvents.add(event)

      // debounce for 10 milliseconds in case the loading is instant
      const debounceTimer = setTimeout(() => {
        setState('loading')
        setLoadingPercentage(15)
      }, 100) // 100ms is perceived as almost instant so that's a good default

      const finishEvent = () => {
        clearTimeout(debounceTimer)
        const wasInSet = pendingEvents.delete(event)
        if (wasInSet && pendingEvents.size === 0) {
          setState((prevState) =>
            prevState === 'loading' ? 'done' : prevState,
          )
        }
      }

      setTimeout(finishEvent, 20_000)

      return finishEvent
    }

    return () => {
      window.startNavigationLoadingCallback = undefined
    }
  })

  // Only set to inactive again, a short period after we are done
  useEffect(() => {
    if (state === 'done') {
      doneTimeoutRef.current = setTimeout(() => {
        setState('inactive')
      }, 350)
    } else {
      clearTimeout(doneTimeoutRef.current)
    }
  }, [state])

  useEffect(() => {
    if (state === 'loading') {
      setLoadingPercentage(15)
      loadingIntervalRef.current = setInterval(() => {
        // Close in on 90% but never fully reach it with the loading indicator
        setLoadingPercentage(
          (prevPercentage) => prevPercentage + (90 - prevPercentage) * 0.05,
        )
      }, 700)
    } else {
      clearInterval(loadingIntervalRef.current)
      setLoadingPercentage(0)
    }
  }, [state])

  return (
    <div
      className={clsx(style.loadingIndicator, {
        [style.done]: state === 'done',
        [style.loading]: state === 'loading',
      })}
      style={{
        width: state === 'loading' ? `${loadingPercentage}vw` : undefined,
      }}
    />
  )
}

function startNavigationLoadingIndicator() {
  if (window.startNavigationLoadingCallback) {
    return window.startNavigationLoadingCallback()
  } else {
    return () => undefined
  }
}

export function useLoadingIndicatorTransition() {
  const [isTransitioning, withLoadingIndicatorTransition] = useTransition()

  useEffect(() => {
    if (isTransitioning) {
      return startNavigationLoadingIndicator()
    } else {
      return undefined
    }
  }, [isTransitioning])

  return withLoadingIndicatorTransition
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function withLoadingIndicator<F extends () => any>(
  callback: F,
): Promise<ReturnType<F>> {
  const stopNavigationLoadingIndicator = startNavigationLoadingIndicator()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any
  try {
    result = await callback()
  } finally {
    stopNavigationLoadingIndicator()
  }

  return result
}

export function LinkLoadingIndicator() {
  const { pending } = useLinkStatus()

  useEffect(() => {
    if (pending) {
      return startNavigationLoadingIndicator()
    } else {
      return undefined
    }
  }, [pending])

  return null
}
