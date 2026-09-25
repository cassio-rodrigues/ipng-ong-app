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
  BellRing,
  ChevronRight,
  ClipboardCheck,
  AlertTriangle,
  BarChart3,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { classesApi, statsApi, unitsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { firstName } from "@/lib/whatsapp"
import type { Class_ } from "@/types"
import { useAlerts } from "@/hooks/use-alerts"
import { AlertList } from "@/components/shared/AlertList"
import { useUpcomingLessons, UpcomingLessonsCard } from "@/components/shared/UpcomingLessons"
import { WhatsAppButton } from "@/components/shared/WhatsAppButton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const allItems = [
  { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard, color: "bg-violet-500",  teacherHidden: false },
  { href: "/classes",     label: "Turmas",       icon: GraduationCap,   color: "bg-orange-500", teacherHidden: false },
  { href: "/analise",     label: "Análise",      icon: BarChart3,       color: "bg-blue-600",   teacherHidden: true  },
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

interface BirthdayPerson { id: string; name: string; type: "student" | "teacher"; day: number; phone: string | null }
interface WeekBirthday extends BirthdayPerson { date: Date; isToday: boolean }
interface InstitutionalStats { students: number; activeStudents: number; units: number; volunteers: number }

export default function InicioPage() {
  const { isTeacher, user } = useAuth()
  const items = allItems.filter(item => !isTeacher || !item.teacherHidden)
  const { alerts, loading: alertsLoading } = useAlerts()
  const upcoming = useUpcomingLessons(7)

  // Atalho para as turmas do usuário (principal ou atribuído): um clique até a chamada
  const [myClasses, setMyClasses] = useState<Class_[]>([])
  useEffect(() => {
    if (!user?.id) return
    classesApi.list({ teacher_id: user.id, status: "active" }).then(r => setMyClasses(r.data)).catch(() => {})
  }, [user?.id])

  // Aniversariantes de hoje até +6 dias (a semana pode atravessar a virada do mês)
  const [birthdays, setBirthdays] = useState<WeekBirthday[]>([])
  useEffect(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() + i); return d })
    const months = [...new Set(days.map(d => d.getMonth() + 1))]
    Promise.all(months.map(m => statsApi.birthdays(m).then(r => ({ m, people: r.data as BirthdayPerson[] }))))
      .then(results => {
        const week: WeekBirthday[] = []
        for (const d of days) {
          const people = results.find(r => r.m === d.getMonth() + 1)?.people ?? []
          for (const p of people.filter(p => p.day === d.getDate())) week.push({ ...p, date: d, isToday: d.getTime() === today.getTime() })
        }
        setBirthdays(week)
      })
      .catch(() => {})
  }, [])
  const birthdaysToday = birthdays.filter(b => b.isToday)

  // Números institucionais: só gestão (o endpoint de estatísticas é visão geral da ONG)
  const [inst, setInst] = useState<InstitutionalStats | null>(null)
  useEffect(() => {
    if (!user?.role || user.role === "teacher") return
    Promise.all([statsApi.dashboard(), unitsApi.list()])
      .then(([s, u]) => setInst({
        students: s.data.students.total, activeStudents: s.data.students.active,
        units: (u.data as { status: string | null }[]).filter(x => x.status === "active").length,
        volunteers: s.data.teachers.active,
      }))
      .catch(() => {})
  }, [user?.role])

  const risk = alerts.filter(a => a.type === "attendance_risk").length
  const actionable = alerts.filter(a => a.severity !== "low").length
  const pendingCalls = upcoming.pendingAttendance.length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Olá, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Números institucionais (gestão) */}
      {inst && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile href="/students" icon={UserCheck} label="Total de alunos" value={inst.students} />
          <Tile href="/students" icon={UserCheck} label="Alunos ativos" value={inst.activeStudents}
            sub={inst.students ? `${Math.round(inst.activeStudents / inst.students * 100)}% do total` : undefined} />
          <Tile href="/units" icon={Building2} label="Unidades ativas" value={inst.units} />
          <Tile href="/users" icon={Users} label="Volunteachers ativos" value={inst.volunteers} />
        </div>
      )}

      {/* Números do dia */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile
          href="/lessons" icon={ClipboardList} label="Aulas hoje"
          value={upcoming.loading ? "…" : upcoming.todayLessons.length}
          sub={upcoming.todayLessons.length === 0 ? "Nenhuma aula hoje" : undefined}
        />
        <Tile
          href={upcoming.pendingAttendance[0] ? `/lessons/${upcoming.pendingAttendance[0].id}?tab=attendance` : "/lessons"}
          icon={ClipboardCheck} label="Chamadas pendentes"
          value={upcoming.loading ? "…" : pendingCalls}
          tone={pendingCalls > 0 ? "warning" : undefined}
          sub={pendingCalls > 0 ? "Aulas de hoje sem presença registrada" : "Em dia"}
        />
        <Tile
          href="/pendencias" icon={BellRing} label="Pendências"
          value={alertsLoading ? "…" : actionable}
          tone={risk > 0 ? "critical" : actionable > 0 ? "warning" : undefined}
          sub={risk > 0 ? `${risk} com risco de evasão` : actionable === 0 ? "Nada pendente 🎉" : undefined}
        />
        <Tile
          href="/aniversariantes" icon={Cake} label="Aniversariantes da semana"
          value={birthdays.length}
          sub={birthdaysToday.length > 0 ? `Hoje: ${birthdaysToday.map(b => firstName(b.name)).join(", ")}` : birthdays.length === 0 ? "Ninguém nos próximos 7 dias" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingLessonsCard {...upcoming} max={6} />

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-red-500" />
                <CardTitle className="text-base">Prioridades</CardTitle>
                {alerts.length > 0 && <Link href="/pendencias" className="ml-auto text-xs text-muted-foreground hover:underline">Ver todas ({alerts.length})</Link>}
              </div>
            </CardHeader>
            <CardContent>
              {alertsLoading
                ? <p className="text-sm text-muted-foreground">Carregando…</p>
                : <AlertList alerts={alerts.slice(0, 4)} emptyText="Nenhuma pendência. 🎉" />}
            </CardContent>
          </Card>

          {birthdays.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2"><Cake className="size-4 text-pink-500" /><CardTitle className="text-base">Aniversariantes da semana</CardTitle></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {birthdays.map(b => (
                    <li key={`${b.type}-${b.id}`} className={cn("flex items-center gap-3 text-sm rounded-md px-2 py-1 -mx-2", b.isToday && "bg-pink-50 dark:bg-pink-950/30")}>
                      <span className={cn("w-16 shrink-0 text-xs", b.isToday ? "font-semibold text-pink-700 dark:text-pink-300" : "text-muted-foreground")}>
                        {b.isToday ? "Hoje 🎂" : b.date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}
                      </span>
                      <span className="flex-1 font-medium">{b.name}</span>
                      <span className="text-xs text-muted-foreground">{b.type === "student" ? "Aluno" : "Equipe"}</span>
                      <WhatsAppButton
                        phone={b.phone} label={b.isToday ? "Parabenizar" : "WhatsApp"} iconOnly={!b.isToday}
                        message={`Feliz aniversário, ${firstName(b.name)}! 🎉 Toda a equipe do Inglês Para Nossa Gente deseja um dia incrível e um ano cheio de conquistas. Happy birthday! 🎂`}
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {myClasses.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Minhas turmas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myClasses.map(c => {
              const pending = alerts.filter(a => a.class_id === c.id).length
              return (
                <Link
                  key={c.id}
                  href={`/classes/${c.id}?tab=hoje`}
                  className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40 active:scale-[0.98]"
                >
                  <div className="bg-orange-500 rounded-xl p-2.5 text-white"><GraduationCap className="size-5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.level ?? "Sem nível"}
                      {pending > 0 && <span className="text-red-600 dark:text-red-400 font-medium"> · {pending} {pending === 1 ? "pendência" : "pendências"}</span>}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Atalhos</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {items.map(({ href, label, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-card p-3 text-center transition-all hover:shadow-md hover:border-primary/40 active:scale-95"
            >
              <div className={`${color} rounded-xl p-2.5 text-white shadow-sm`}>
                <Icon className="size-5" />
              </div>
              <span className="text-xs font-medium leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function Tile({
  href, icon: Icon, label, value, sub, tone,
}: { href: string; icon: typeof Cake; label: string; value: number | string; sub?: string; tone?: "critical" | "warning" }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-xl border bg-card p-4 transition-shadow hover:shadow-md",
        tone === "critical" && "border-2 border-red-500 bg-red-50 dark:bg-red-950/30",
        tone === "warning" && "border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Icon className={cn("size-4", tone === "critical" ? "text-red-500" : tone === "warning" ? "text-amber-500" : "text-muted-foreground")} />
      </div>
      <div className={cn(
        "mt-1 text-3xl font-bold tabular-nums",
        tone === "critical" && "text-red-600 dark:text-red-400",
        tone === "warning" && "text-amber-600 dark:text-amber-400",
      )}>{value}</div>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground truncate">{sub}</p>}
    </Link>
  )
}
