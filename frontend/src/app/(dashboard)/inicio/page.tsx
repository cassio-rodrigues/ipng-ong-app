"use client"

import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  GraduationCap,
  UserCheck,
  ClipboardList,
  Star,
  Zap,
  Trophy,
  CalendarDays,
  BookMarked,
  ScrollText,
  Cake,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

const allItems = [
  { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard, color: "bg-violet-500",  teacherHidden: false },
  { href: "/classes",     label: "Turmas",       icon: GraduationCap,   color: "bg-orange-500", teacherHidden: false },
  { href: "/students",    label: "Alunos",       icon: UserCheck,       color: "bg-green-500",  teacherHidden: false },
  { href: "/lessons",     label: "Aulas",        icon: ClipboardList,   color: "bg-blue-500",   teacherHidden: false },
  { href: "/assessments", label: "Avaliações",   icon: Star,            color: "bg-yellow-500", teacherHidden: false },
  { href: "/activities",  label: "Atividades",   icon: Zap,             color: "bg-cyan-500",   teacherHidden: false },
  { href: "/highlights",  label: "Destaques",    icon: Trophy,          color: "bg-amber-500",  teacherHidden: false },
  { href: "/calendar",        label: "Calendário",     icon: CalendarDays, color: "bg-sky-500",    teacherHidden: false },
  { href: "/aniversariantes", label: "Aniversariantes", icon: Cake,         color: "bg-pink-500",   teacherHidden: false },
  { href: "/users",       label: "Usuários",     icon: Users,           color: "bg-indigo-500", teacherHidden: true  },
  { href: "/units",       label: "Unidades",     icon: Building2,       color: "bg-teal-500",   teacherHidden: true  },
  { href: "/books",       label: "Livros",       icon: BookOpen,        color: "bg-lime-500",   teacherHidden: true  },
  { href: "/loans",       label: "Biblioteca",   icon: BookMarked,      color: "bg-rose-500",   teacherHidden: true  },
  { href: "/audit",       label: "Auditoria",    icon: ScrollText,      color: "bg-slate-500",  teacherHidden: true  },
]

export default function InicioPage() {
  const { isTeacher, user } = useAuth()
  const items = allItems.filter(item => !isTeacher || !item.teacherHidden)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {user?.name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-base text-muted-foreground mt-2">
          Bem-vindo(a) de volta. O que vamos fazer hoje?
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card p-6 text-center transition-all hover:shadow-md hover:border-primary/40 active:scale-95"
          >
            <div className={`${color} rounded-2xl p-4 text-white shadow-sm`}>
              <Icon className="size-7" />
            </div>
            <span className="text-sm font-medium leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
