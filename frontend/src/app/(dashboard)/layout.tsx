"use client"

import { Sidebar } from "@/components/shared/Sidebar"
import { AuthGuard } from "@/components/shared/AuthGuard"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-muted/20">
          <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
        </main>
      </div>
    </AuthGuard>
  )
}
