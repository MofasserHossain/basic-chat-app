'use client'
import { withLoadingIndicator } from '@/components/navigation-loading-indicator/navigation-loading-indicator'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useLoadingRouter } from '@/hooks/use-loading-router'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  const router = useLoadingRouter()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted/10">
            <FileQuestion className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4 text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <p className="text-sm text-muted-foreground">
            Please check the URL or navigate back to a valid page.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => {
              void withLoadingIndicator(async () => {
                router.push('/')
              })
            }}
          >
            Log out
          </Button>
          <Button onClick={() => router.push('/app')}>Back to app</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
