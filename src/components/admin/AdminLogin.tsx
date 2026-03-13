'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/app/admin/actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(false)
    setLoading(true)

    const result = await loginAction(password)
    if (result.success) {
      router.refresh()
    } else {
      setError(true)
      setPassword('')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Dansk Fugleviden</CardTitle>
          <CardDescription>Log ind for at tilgå admin</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Adgangskode"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive mt-2">
                  Forkert adgangskode
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? 'Logger ind...' : 'Log ind'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
