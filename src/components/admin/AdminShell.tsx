'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Bird,
  Image,
  Layers,
  BarChart3,
  ClipboardList,
  ArrowLeft,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

const NAV_ITEMS = [
  { href: '/admin', label: 'Oversigt', icon: Home },
  { href: '/admin/birds', label: 'Fugle', icon: Bird },
  { href: '/admin/images', label: 'Billeder', icon: Image },
  { href: '/admin/groups', label: 'Grupper', icon: Layers },
  { href: '/admin/analytics', label: 'Analyse', icon: BarChart3 },
  { href: '/admin/audit', label: 'Logbog', icon: ClipboardList },
]

function usePageTitle(pathname: string) {
  const match = NAV_ITEMS.find(item =>
    item.href === '/admin'
      ? pathname === '/admin'
      : pathname.startsWith(item.href)
  )
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
              Dansk Fugleviden
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-2 py-2">
          <SidebarMenu>
            {NAV_ITEMS.map(item => {
              const isActive = item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href)

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive}
                    tooltip={item.label}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
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
    </SidebarProvider>
  )
}
