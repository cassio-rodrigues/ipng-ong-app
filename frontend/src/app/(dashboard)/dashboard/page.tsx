"use client"

import { useEffect, useState } from "react"
import { statsApi, calendarApi, classesApi, studentsApi, lessonsApi, unitsApi, usersApi } from "@/lib/api"
import type { CalendarEvent, Class_, Student, Lesson, Unit, User } from "@/types"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  GraduationCap,
  UserCheck,
  Users,
  UserX,
  BookOpen,
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Building2,
} from "lucide-react"

interface ClassCount { class_id: string; class_name: string; count: number }
interface Stats {
  students: { total: number; active: number; inactive: number; by_gender: { M: number; F: number; O: number; unknown: number } }
  teachers: { total: number; active: number; inactive: number }
  classes: { total: number; active: number }
  students_per_class: ClassCount[]
  absences_per_class: ClassCount[]
}

// ── Shared: month calendar ──────────────────────────────────────────────────

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
const DAY_NAMES   = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"]
const TYPE_COLOR: Record<string, string> = {
  holiday: "bg-red-500",
  institutional: "bg-blue-500",
  class_event: "bg-green-500",
}

function parseLocalDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}

function MonthCalendar() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const mm = String(month + 1).padStart(2, "0")
    const lastDay = new Date(year, month + 1, 0).getDate()
    setLoading(true)
    calendarApi.list({ start_date: `${year}-${mm}-01`, end_date: `${year}-${mm}-${lastDay}` })
      .then(r => setEvents(r.data))
      .finally(() => setLoading(false))
  }, [year, month])

  const prevMonth = () => month === 0  ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1)
  const nextMonth = () => month === 11 ? (setMonth(0),  setYear(y => y + 1)) : setMonth(m => m + 1)

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth    = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const eventsByDay: Record<number, CalendarEvent[]> = {}
  for (const ev of events) {
    if (!ev.start_date) continue
    const start  = parseLocalDate(ev.start_date)
    const end    = ev.end_date ? parseLocalDate(ev.end_date) : new Date(start)
    const cursor = new Date(start)
    while (cursor <= end) {
      if (cursor.getFullYear() === year && cursor.getMonth() === month) {
        const d = cursor.getDate()
        eventsByDay[d] = [...(eventsByDay[d] ?? []), ev]
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  const isToday = (day: number) => day === now.getDate() && month === now.getMonth() && year === now.getFullYear()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-sky-500" />
            <CardTitle className="text-base">{MONTH_NAMES[month]} {year}</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}><ChevronLeft className="size-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground mb-1">
          {DAY_NAMES.map(d => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className={cn("grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden", loading && "opacity-50")}>
          {cells.map((day, i) => (
            <div key={i} className={cn("min-h-16 p-1 text-xs bg-card", !day && "bg-muted/30")}>
              {day && (
                <>
                  <div className={cn("w-6 h-6 flex items-center justify-center rounded-full font-medium mb-1 text-xs", isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground")}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {(eventsByDay[day] ?? []).slice(0, 2).map((ev, j) => (
                      <div key={j} title={ev.title ?? ""} className={cn("truncate rounded px-1 py-0.5 text-white leading-tight text-[10px]", TYPE_COLOR[ev.event_type ?? ""] ?? "bg-gray-500")}>
                        {ev.title}
                      </div>
                    ))}
                    {(eventsByDay[day]?.length ?? 0) > 2 && (
                      <div className="text-[10px] text-muted-foreground pl-1">+{eventsByDay[day].length - 2} mais</div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-[11px] text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block shrink-0" />Feriado</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block shrink-0" />Institucional</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block shrink-0" />Evento de turma</span>
        </div>
        {!loading && events.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-3">Nenhum evento cadastrado neste mês</p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Shared: stat card ───────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: number | string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`size-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ── Tab selector ────────────────────────────────────────────────────────────

interface TabItem { key: string; label: string; icon: React.ElementType; color: string }

function TabBar<T extends string>({ tabs, active, onChange }: { tabs: TabItem[]; active: T; onChange: (k: T) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {tabs.map(({ key, label, icon: Icon, color }) => (
        <button
          key={key}
          onClick={() => onChange(key as T)}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
            "hover:shadow-md active:scale-95 cursor-pointer",
            active === key
              ? "border-primary bg-primary/5 text-primary shadow-sm"
              : "bg-card text-foreground hover:border-primary/40",
          )}
        >
          <div className={cn("rounded-lg p-2 text-white shadow-sm", color)}>
            <Icon className="size-4" />
          </div>
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Admin dashboard ─────────────────────────────────────────────────────────

type AdminTab = "alunos" | "professores" | "turmas" | "unidades" | "calendario"

const ADMIN_TABS: TabItem[] = [
  { key: "alunos",      label: "Alunos",      icon: UserCheck,     color: "bg-green-500"  },
  { key: "professores", label: "Professores",  icon: Users,         color: "bg-blue-500"   },
  { key: "turmas",      label: "Turmas",       icon: GraduationCap, color: "bg-orange-500" },
  { key: "unidades",    label: "Unidades",     icon: Building2,     color: "bg-teal-500"   },
  { key: "calendario",  label: "Calendário",   icon: CalendarDays,  color: "bg-sky-500"    },
]

export default function DashboardPage() {
  const { isTeacher, user } = useAuth()
  const [data,         setData]         = useState<Stats | null>(null)
  const [units,        setUnits]        = useState<Unit[]>([])
  const [teacherUsers, setTeacherUsers] = useState<User[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(false)
  const [tab,          setTab]          = useState<AdminTab>("alunos")

  useEffect(() => {
    if (!user?.role || isTeacher) return
    Promise.all([statsApi.dashboard(), unitsApi.list(), usersApi.list()])
      .then(([sRes, uRes, userRes]) => {
        setData(sRes.data)
        setUnits(uRes.data)
        setTeacherUsers((userRes.data as User[]).filter(u => u.role === "teacher"))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [user?.role, isTeacher])

  if (isTeacher) return <TeacherDashboard />

  if (loading) return (
    <div><h1 className="text-2xl font-bold mb-6">Dashboard</h1><p className="text-muted-foreground text-sm">Carregando métricas…</p></div>
  )

  if (error || !data) return (
    <div><h1 className="text-2xl font-bold mb-6">Dashboard</h1><p className="text-sm text-destructive">Erro ao carregar métricas.</p></div>
  )

  const { students, teachers, classes, students_per_class, absences_per_class } = data
  const maxSpc = Math.max(...students_per_class.map(r => r.count), 1)
  const maxAbs = Math.max(...absences_per_class.map(r => r.count), 1)

  const genderSub = [
    students.by_gender.M > 0 ? `${students.by_gender.M} M` : null,
    students.by_gender.F > 0 ? `${students.by_gender.F} F` : null,
    students.by_gender.O > 0 ? `${students.by_gender.O} outro(s)` : null,
  ].filter(Boolean).join(" · ")

  const teacherGender = {
    M: teacherUsers.filter(u => u.gender === "M").length,
    F: teacherUsers.filter(u => u.gender === "F").length,
    O: teacherUsers.filter(u => u.gender !== "M" && u.gender !== "F").length,
  }

  const activeUnits   = units.filter(u => u.status === "active").length
  const inactiveUnits = units.length - activeUnits

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <TabBar tabs={ADMIN_TABS} active={tab} onChange={setTab} />

      {/* Alunos */}
      {tab === "alunos" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total de alunos" value={students.total} sub={genderSub || undefined} icon={UserCheck} color="text-purple-500" />
            <StatCard label="Ativos"   value={students.active}   sub={`${students.total > 0 ? Math.round(students.active / students.total * 100) : 0}% do total`} icon={UserCheck} color="text-green-500" />
            <StatCard label="Inativos" value={students.inactive} icon={UserX} color="text-red-400" />
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Por gênero</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {[{ key: "M", label: "Masculino", color: "bg-blue-500" }, { key: "F", label: "Feminino", color: "bg-pink-500" }, { key: "O", label: "Outro", color: "bg-yellow-500" }].map(({ key, label, color }) => {
                  const n = students.by_gender[key as keyof typeof students.by_gender]
                  const pct = students.total > 0 ? Math.round(n / students.total * 100) : 0
                  return (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <div className="flex-1">
                        <div className="flex justify-between mb-0.5"><span className="text-muted-foreground">{label}</span><span className="font-medium">{n}</span></div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} /></div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2"><BookOpen className="size-4 text-purple-500" /><CardTitle className="text-base">Alunos por turma</CardTitle></div>
            </CardHeader>
            <CardContent className="p-0">
              {students_per_class.length === 0 ? (
                <p className="text-sm text-muted-foreground px-6 pb-6">Nenhum dado disponível</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Turma</TableHead><TableHead className="w-20 text-right">Alunos</TableHead><TableHead className="w-40" /></TableRow></TableHeader>
                  <TableBody>
                    {students_per_class.map(r => (
                      <TableRow key={r.class_id}>
                        <TableCell className="font-medium">{r.class_name}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                        <TableCell><div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.round(r.count / maxSpc * 100)}%` }} /></div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Professores */}
      {tab === "professores" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total de professores" value={teachers.total} icon={Users} color="text-blue-500" />
            <StatCard label="Ativos"   value={teachers.active}   sub={teachers.inactive > 0 ? `${teachers.inactive} inativos` : "todos ativos"} icon={Users} color="text-green-500" />
            <StatCard label="Inativos" value={teachers.inactive} icon={UserX} color="text-red-400" />
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Por gênero</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {[{ key: "M", label: "Masculino", color: "bg-blue-500" }, { key: "F", label: "Feminino", color: "bg-pink-500" }, { key: "O", label: "Outro", color: "bg-yellow-500" }].map(({ key, label, color }) => {
                  const n = teacherGender[key as keyof typeof teacherGender]
                  const pct = teachers.total > 0 ? Math.round(n / teachers.total * 100) : 0
                  return (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <div className="flex-1">
                        <div className="flex justify-between mb-0.5"><span className="text-muted-foreground">{label}</span><span className="font-medium">{n}</span></div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} /></div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Turmas */}
      {tab === "turmas" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total de turmas" value={classes.total}  icon={GraduationCap} color="text-orange-500" />
            <StatCard label="Ativas"           value={classes.active} sub={`${classes.total - classes.active} inativas`} icon={GraduationCap} color="text-green-500" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3"><div className="flex items-center gap-2"><BookOpen className="size-4 text-purple-500" /><CardTitle className="text-base">Alunos por turma</CardTitle></div></CardHeader>
              <CardContent className="p-0">
                {students_per_class.length === 0 ? <p className="text-sm text-muted-foreground px-6 pb-6">Nenhum dado</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Turma</TableHead><TableHead className="w-20 text-right">Alunos</TableHead><TableHead className="w-32" /></TableRow></TableHeader>
                    <TableBody>
                      {students_per_class.map(r => (
                        <TableRow key={r.class_id}>
                          <TableCell className="font-medium">{r.class_name}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                          <TableCell><div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.round(r.count / maxSpc * 100)}%` }} /></div></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><div className="flex items-center gap-2"><AlertTriangle className="size-4 text-orange-500" /><CardTitle className="text-base">Faltas por turma</CardTitle></div></CardHeader>
              <CardContent className="p-0">
                {absences_per_class.length === 0 ? <p className="text-sm text-muted-foreground px-6 pb-6">Nenhuma falta registrada</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Turma</TableHead><TableHead className="w-20 text-right">Faltas</TableHead><TableHead className="w-32" /></TableRow></TableHeader>
                    <TableBody>
                      {absences_per_class.map(r => (
                        <TableRow key={r.class_id}>
                          <TableCell className="font-medium">{r.class_name}</TableCell>
                          <TableCell className="text-right tabular-nums"><Badge variant={r.count > 10 ? "destructive" : "secondary"}>{r.count}</Badge></TableCell>
                          <TableCell><div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.round(r.count / maxAbs * 100)}%` }} /></div></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Unidades */}
      {tab === "unidades" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total de unidades" value={units.length}  icon={Building2} color="text-teal-500" />
            <StatCard label="Ativas"             value={activeUnits}   sub={`${inactiveUnits} inativas`} icon={Building2} color="text-green-500" />
            <StatCard label="Inativas"           value={inactiveUnits} icon={UserX} color="text-red-400" />
          </div>
          <Card>
            <CardHeader className="pb-3"><div className="flex items-center gap-2"><Building2 className="size-4 text-teal-500" /><CardTitle className="text-base">Unidades cadastradas</CardTitle></div></CardHeader>
            <CardContent className="p-0">
              {units.length === 0 ? <p className="text-sm text-muted-foreground px-6 pb-6">Nenhuma unidade cadastrada</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Endereço</TableHead><TableHead className="w-24">Status</TableHead><TableHead className="w-32" /></TableRow></TableHeader>
                  <TableBody>
                    {units.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.address ?? "—"}</TableCell>
                        <TableCell><Badge variant={u.status === "active" ? "default" : "secondary"}>{u.status === "active" ? "Ativa" : "Inativa"}</Badge></TableCell>
                        <TableCell>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${u.status === "active" ? "bg-teal-500" : "bg-muted-foreground/30"}`} style={{ width: u.status === "active" ? "100%" : "20%" }} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendário */}
      {tab === "calendario" && <MonthCalendar />}
    </div>
  )
}

// ── Teacher dashboard ───────────────────────────────────────────────────────

type TeacherTab = "turmas" | "alunos" | "calendario"

const TEACHER_TABS: TabItem[] = [
  { key: "turmas",     label: "Turmas",     icon: GraduationCap, color: "bg-orange-500" },
  { key: "alunos",     label: "Alunos",     icon: UserCheck,     color: "bg-green-500"  },
  { key: "calendario", label: "Calendário", icon: CalendarDays,  color: "bg-sky-500"    },
]

function TeacherDashboard() {
  const { user } = useAuth()
  const [classes,  setClasses]  = useState<Class_[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [lessons,  setLessons]  = useState<Lesson[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<TeacherTab>("turmas")

  useEffect(() => {
    if (!user?.id) return
    Promise.all([
      classesApi.list({ teacher_id: user.id }),
      studentsApi.list({ teacher_id: user.id, status: "active" }),
      lessonsApi.list({ teacher_id: user.id, status: "scheduled" }),
    ]).then(([cRes, sRes, lRes]) => {
      setClasses(cRes.data)
      setStudents(sRes.data)
      setLessons(lRes.data.slice(0, 8))
    }).finally(() => setLoading(false))
  }, [user?.id])

  if (loading) return <p className="text-muted-foreground text-sm">Carregando…</p>

  const activeClasses = classes.filter(c => c.status === "active")
  const byGender = {
    M: students.filter(s => s.gender === "M").length,
    F: students.filter(s => s.gender === "F").length,
    O: students.filter(s => s.gender !== "M" && s.gender !== "F").length,
  }
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]))

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Olá, {user?.name?.split(" ")[0]} 👋</h1>

      <TabBar tabs={TEACHER_TABS} active={tab} onChange={setTab} />

      {/* Turmas */}
      {tab === "turmas" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="Turmas ativas" value={activeClasses.length} icon={GraduationCap} color="text-orange-500" />
            <StatCard label="Total de turmas" value={classes.length} icon={GraduationCap} color="text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Próximas aulas agendadas</h2>
            {lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma aula agendada.</p>
            ) : (
              <div className="rounded-md border bg-card overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Turma</TableHead><TableHead>Data / Hora</TableHead><TableHead className="w-36" /></TableRow></TableHeader>
                  <TableBody>
                    {lessons.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{classMap[l.class_id ?? ""] ?? "—"}</TableCell>
                        <TableCell>{l.scheduled_at ? new Date(l.scheduled_at).toLocaleString("pt-BR") : "—"}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" asChild>
                            <Link href={`/lessons/${l.id}`}><ClipboardList className="size-3.5" />Chamada</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="mt-2">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" asChild>
                <Link href="/lessons"><ExternalLink className="size-3.5" />Ver todas as aulas</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alunos */}
      {tab === "alunos" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Alunos ativos" value={students.length} icon={UserCheck} color="text-green-500" />
          <StatCard label="Masculino" value={byGender.M} icon={Users} color="text-blue-500" />
          <StatCard label="Feminino"  value={byGender.F} icon={Users} color="text-pink-500" />
          <StatCard label="Outro"     value={byGender.O} icon={Users} color="text-yellow-500" />
        </div>
      )}

      {/* Calendário */}
      {tab === "calendario" && <MonthCalendar />}
    </div>
  )
}
