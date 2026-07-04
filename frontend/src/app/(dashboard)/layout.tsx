"use client"

import { Sidebar } from "@/components/shared/Sidebar"
import { AuthGuard } from "@/components/shared/AuthGuard"
import { ChangePasswordModal } from "@/components/shared/ChangePasswordModal"
import { useAuth } from "@/hooks/use-auth"

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth()

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
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
