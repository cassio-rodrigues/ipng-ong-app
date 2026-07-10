"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Home,
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
  BookMarked,
  Menu,
  Cake,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

const allNavItems = [
  { href: "/inicio",    label: "Início",    icon: Home,            teacherHidden: false },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, teacherHidden: false },
  { href: "/users", label: "Usuários", icon: Users, teacherHidden: true },
  { href: "/units", label: "Unidades", icon: Building2, teacherHidden: true },
  { href: "/books", label: "Livros", icon: BookOpen, teacherHidden: true },
  { href: "/classes", label: "Turmas", icon: GraduationCap, teacherHidden: false },
  { href: "/students", label: "Alunos", icon: UserCheck, teacherHidden: false },
  { href: "/lessons", label: "Aulas", icon: ClipboardList, teacherHidden: false },
  { href: "/assessments", label: "Avaliações", icon: Star, teacherHidden: false },
  { href: "/activities", label: "Atividades", icon: Zap, teacherHidden: false },
  { href: "/highlights", label: "Destaques", icon: Trophy, teacherHidden: false },
  { href: "/calendar",        label: "Calendário",     icon: CalendarDays, teacherHidden: false },
  { href: "/aniversariantes", label: "Aniversariantes", icon: Cake,         teacherHidden: false },
  { href: "/loans",           label: "Biblioteca",      icon: BookMarked,   teacherHidden: true  },
  { href: "/audit", label: "Auditoria", icon: ScrollText, teacherHidden: true },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const isTeacher = user?.role === "teacher"
  const navItems = allNavItems.filter(item => !isTeacher || !item.teacherHidden)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-sidebar-border">
        <Link href="/inicio" onClick={onNavigate}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="IPNG" className="h-12 w-auto object-contain" />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
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
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border shrink-0">
      <NavLinks />
    </aside>
  )
}

export function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-sidebar border-b border-sidebar-border sticky top-0 z-40">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="text-sidebar-foreground">
          <Menu className="size-5" />
        </Button>
        <Link href="/inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="IPNG" className="h-8 w-auto object-contain" />
        </Link>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border" aria-describedby={undefined}>
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <NavLinks onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
