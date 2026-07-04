"use client"

import { Sidebar, MobileHeader } from "@/components/shared/Sidebar"
import { AuthGuard } from "@/components/shared/AuthGuard"
import { ChangePasswordModal } from "@/components/shared/ChangePasswordModal"
import { useAuth } from "@/hooks/use-auth"

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth()

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <MobileHeader />
        <main className="flex-1 overflow-auto bg-muted/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
        </main>
      </div>
      {user?.must_change_password && <ChangePasswordModal onSuccess={refreshUser} />}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardContent>{children}</DashboardContent>
    </AuthGuard>
  )
}
