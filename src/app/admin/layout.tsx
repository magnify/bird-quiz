import { checkAuth } from './actions'
import AdminShell from '@/components/admin/AdminShell'
import AdminLogin from '@/components/admin/AdminLogin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authenticated = await checkAuth()

  if (!authenticated) {
    return <AdminLogin />
  }

  return <AdminShell>{children}</AdminShell>
}
