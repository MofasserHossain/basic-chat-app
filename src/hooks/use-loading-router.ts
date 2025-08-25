import { useLoadingIndicatorTransition } from '@/components/navigation-loading-indicator/navigation-loading-indicator'
import { useRouter } from 'next/navigation'

export function useLoadingRouter() {
  const router = useRouter()
  const withLoadingIndicatorTransition = useLoadingIndicatorTransition()
  return {
    ...router,
    push(...args: Parameters<typeof router.push>) {
      withLoadingIndicatorTransition(() => {
        router.push(...args)
      })
    },
  }
}
