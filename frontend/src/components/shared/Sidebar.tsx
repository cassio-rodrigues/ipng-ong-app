"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  GraduationCap,
  UserCheck,
  CalendarDays,
  ClipboardList,
  Star,
  Zap,
  Trophy,
  ScrollText,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Usuários", icon: Users },
  { href: "/units", label: "Unidades", icon: Building2 },
  { href: "/books", label: "Livros", icon: BookOpen },
  { href: "/classes", label: "Turmas", icon: GraduationCap },
  { href: "/students", label: "Alunos", icon: UserCheck },
  { href: "/lessons", label: "Aulas", icon: ClipboardList },
  { href: "/assessments", label: "Avaliações", icon: Star },
  { href: "/activities", label: "Atividades", icon: Zap },
  { href: "/highlights", label: "Destaques", icon: Trophy },
  { href: "/calendar", label: "Calendário", icon: CalendarDays },
  { href: "/audit", label: "Auditoria", icon: ScrollText },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border">
      <div className="px-6 py-4 border-b border-sidebar-border">
        <Image src="/logo.png" alt="IPNG" width={140} height={48} className="object-contain" priority />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email ?? "—"}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </aside>
  )
}
