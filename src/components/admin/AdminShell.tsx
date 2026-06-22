'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Toaster } from '@/components/ui/sonner'
import { BRAND } from '@/lib/brand'
import {
  Home,
  Bird,
  Image,
  Layers,
  BarChart3,
  Users,
  ClipboardList,
  ArrowLeft,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { logoutAction } from '@/app/admin/actions'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  children?: NavItem[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Oversigt', icon: Home },
  { href: '/admin/birds', label: 'Fugle', icon: Bird },
  { href: '/admin/images', label: 'Billeder', icon: Image },
  { href: '/admin/groups', label: 'Grupper', icon: Layers },
  {
    href: '/admin/analytics', label: 'Analyse', icon: BarChart3,
    children: [{ href: '/admin/players', label: 'Spillere', icon: Users }],
  },
  { href: '/admin/audit', label: 'Logbog', icon: ClipboardList },
]

function isItemActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
}

function usePageTitle(pathname: string) {
  const flat = NAV_ITEMS.flatMap(item => (item.children ? [item, ...item.children] : [item]))
  // Children first so a sub-page wins over its parent's prefix match.
  const match = [...flat].reverse().find(item => isItemActive(pathname, item.href))
  return match?.label ?? 'Admin'
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const pageTitle = usePageTitle(pathname)

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader className="px-4 py-4">
          <Link href="/admin" className="flex items-center gap-2 no-underline">
            <span className="font-semibold text-sm text-sidebar-foreground">
              {BRAND.name}
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-2 py-2">
          <SidebarMenu>
            {NAV_ITEMS.map(item => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={isItemActive(pathname, item.href)}
                  tooltip={item.label}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
                {item.children && (
                  <SidebarMenuSub>
                    {item.children.map(sub => (
                      <SidebarMenuSubItem key={sub.href}>
                        <SidebarMenuSubButton
                          render={<Link href={sub.href} />}
                          isActive={isItemActive(pathname, sub.href)}
                        >
                          <sub.icon className="size-4" />
                          <span>{sub.label}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="px-2 py-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link href="/" />} tooltip="Tilbage til quiz">
                <ArrowLeft className="size-4" />
                <span>Tilbage til quiz</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Log ud"
                onClick={async () => {
                  await logoutAction()
                  window.location.reload()
                }}
              >
                <LogOut className="size-4" />
                <span>Log ud</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-base font-medium">{pageTitle}</h1>
          </div>
        </header>
        <div className="@container/main flex flex-1 flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {children}
          </div>
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
