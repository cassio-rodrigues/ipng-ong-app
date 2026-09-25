"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { classesApi, unitsApi, usersApi, lessonsApi, assessmentsApi, calendarApi, activitiesApi, highlightsApi } from "@/lib/api"
import { eventsOnDay, localDay, calendarWindowStart, EVENT_TYPE_LABEL } from "@/lib/calendar"
import type { Activity, Assessment, Attendance, CalendarEvent, Class_, ClassStudentSummary, ClassSummary, Lesson, StudentHighlight, Unit, User } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Trash2, UserPlus, Users, UserCheck, BarChart3, AlertTriangle, ClipboardCheck, NotebookPen, PlayCircle, CalendarClock, CheckCircle2, CalendarDays, TrendingDown, Repeat, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { attendanceLevel, formatRate, ATTENDANCE_TEXT, ATTENDANCE_LEVEL_LABEL } from "@/lib/attendance"
import { useAlerts } from "@/hooks/use-alerts"
import { AlertList } from "@/components/shared/AlertList"
import { AttendanceRate } from "@/components/shared/AttendanceRate"
import { gradeLevel, GRADE_TEXT, GRADE_PILL } from "@/lib/grades"
import { highlightBadgeClass, HIGHLIGHT_LABEL } from "@/lib/highlights"
import { formatSchedule, weekdayOf, generateResultMessage, fmtHour } from "@/lib/schedule"
import { toast } from "sonner"


const TABS = ["hoje", "alunos", "aulas", "avaliacoes", "atividades", "destaques", "professores"] as const
type Tab = typeof TABS[number]

const LESSON_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  scheduled: { label: "Agendada", variant: "secondary" },
  completed: { label: "Concluída", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function fmtDateTime(d: string | null) {
  return d ? new Date(d).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"
}
function fmtTime(d: string | null) {
  return d ? new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""
}

const STATUS_LABEL: Record<string, string> = { active: "Ativa", inactive: "Inativa", completed: "Concluída" }
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "secondary",
  completed: "outline",
}

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, canEdit, isTeacher } = useAuth()
  const role = user?.role
  const canManage = canEdit || isTeacher
  const { alerts } = useAlerts({ class_id: id })
  const tabParam = searchParams.get("tab") as Tab | null
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : "hoje"
  // A aba vai para a URL: ao voltar de uma aula, o professor cai na mesma aba
  const setTab = (t: string) => router.replace(`/classes/${id}?tab=${t}`, { scroll: false })

  const [cls, setCls] = useState<Class_ | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [highlights, setHighlights] = useState<StudentHighlight[]>([])
  const [summary, setSummary] = useState<ClassSummary | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [addTeacherId, setAddTeacherId] = useState("")
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const [cRes, sRes, uRes, lRes, aRes, eRes, actRes, hRes] = await Promise.all([
        classesApi.get(id),
        classesApi.getSummary(id),
        unitsApi.list(),
        lessonsApi.list({ class_id: id }),
        assessmentsApi.list({ class_id: id }),
        calendarApi.list({ start_date: calendarWindowStart(), limit: 500 }),
        activitiesApi.list({ class_id: id }),
        highlightsApi.list({ class_id: id }),
      ])
      setHighlights(hRes.data)
      setEvents(eRes.data)
      setActivities(actRes.data)
      const c: Class_ = cRes.data
      setCls(c)
      setLessons(lRes.data)
      setAssessments(aRes.data)
      setSummary(sRes.data)
      setUnits(uRes.data)
      if (role === "admin" || role === "coordinator") {
        // Admin/coordenação: lista completa, necessária para adicionar professores
        const { data } = await usersApi.list({ limit: 200 })
        setTeachers((data as User[]).filter(u => u.role === "teacher" || u.role === "coordinator"))
      } else {
        // Professor não pode listar usuários (GET /users é restrito); busca só os da turma
        const ids = [c.main_teacher_id, ...c.assignments.map(a => a.teacher_id)].filter((x): x is string => !!x)
        const res = await Promise.allSettled(ids.map(tid => usersApi.get(tid)))
        setTeachers(res.flatMap(r => r.status === "fulfilled" ? [r.value.data as User] : []))
      }
    } finally { setLoading(false) }
  }

  // Espera o perfil carregar: antes disso canEdit vale true por padrão
  useEffect(() => { if (role) load() }, [id, role])

  async function handleAddTeacher(e: React.FormEvent) {
    e.preventDefault(); if (!addTeacherId) return; setSaving(true)
    try { await classesApi.addAssignment(id, { teacher_id: addTeacherId }); setAddTeacherId(""); await load() }
    finally { setSaving(false) }
  }

  async function handleRemoveTeacher(assignmentId: string) {
    if (!confirm("Remover este professor da turma?")) return
    await classesApi.removeAssignment(id, assignmentId)
    await load()
  }

  if (loading) return <p className="text-muted-foreground text-sm p-6">Carregando…</p>
  if (!cls) return <p className="text-muted-foreground text-sm p-6">Turma não encontrada.</p>

  const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t.name]))
  const unitName = units.find(u => u.id === cls.unit_id)?.name ?? "—"
  const assignedIds = new Set(cls.assignments.map(a => a.teacher_id))
  const availableTeachers = teachers.filter(t => t.id !== cls.main_teacher_id && !assignedIds.has(t.id))
  const classLevel = attendanceLevel(summary?.attendance_rate ?? 0, summary?.attendance_total ?? 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="size-4" /></Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{cls.name ?? "—"}</h1>
            <Badge variant={STATUS_VARIANT[cls.status ?? "active"] ?? "secondary"}>{STATUS_LABEL[cls.status ?? "active"] ?? cls.status}</Badge>
            {cls.level && <Badge variant="outline">{cls.level}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {unitName}
            {formatSchedule(cls) && <> · <Repeat className="inline size-3.5 -mt-0.5" /> {formatSchedule(cls)}</>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alunos matriculados</CardTitle>
            <Users className="size-5 text-purple-500" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{summary?.student_count ?? 0}</div></CardContent>
        </Card>
        <Card className={cn(classLevel === "critical" && "border-red-500 bg-red-50 dark:bg-red-950/30")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Frequência da turma</CardTitle>
            {classLevel === "critical"
              ? <AlertTriangle className="size-5 text-red-500" />
              : <UserCheck className="size-5 text-green-500" />}
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold", ATTENDANCE_TEXT[classLevel])}>
              {classLevel === "none" ? "—" : formatRate(summary?.attendance_rate ?? 0)}
            </div>
            {classLevel !== "ok" && <p className={cn("text-xs font-medium mt-1", ATTENDANCE_TEXT[classLevel])}>{ATTENDANCE_LEVEL_LABEL[classLevel]}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Média geral</CardTitle>
            <BarChart3 className="size-5 text-orange-500" />
          </CardHeader>
          <CardContent><div className={cn("text-3xl font-bold", GRADE_TEXT[gradeLevel(summary?.grade_average)])}>{summary?.grade_average ?? "—"}</div></CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="alunos">Alunos ({summary?.student_count ?? 0})</TabsTrigger>
          <TabsTrigger value="aulas">Aulas ({lessons.length})</TabsTrigger>
          <TabsTrigger value="avaliacoes">Avaliações ({assessments.length})</TabsTrigger>
          <TabsTrigger value="atividades">Atividades ({activities.length})</TabsTrigger>
          <TabsTrigger value="destaques">Destaques ({highlights.length})</TabsTrigger>
          <TabsTrigger value="professores">Professores</TabsTrigger>
        </TabsList>

        <TabsContent value="hoje" className="space-y-6">
          <TodayPanel cls={cls} lessons={lessons} canManage={canManage} canEdit={canEdit} events={events} />
          {alerts.length > 0 && (
            <section aria-label="Pendências da turma">
              <h2 className="text-base font-semibold mb-2">Pendências da turma ({alerts.length})</h2>
              <AlertList alerts={alerts} hideClass emptyText={null} />
            </section>
          )}
        </TabsContent>

        <TabsContent value="alunos">
          <StudentsTab students={summary?.students ?? []} />
        </TabsContent>

        <TabsContent value="aulas">
          <LessonsTab cls={cls} lessons={lessons} events={events} canManage={canManage} onChange={load} />
        </TabsContent>

        <TabsContent value="avaliacoes">
          <AssessmentsTab assessments={assessments} studentCount={summary?.student_count ?? 0} classId={id} canManage={canManage} onChange={load} />
        </TabsContent>

        <TabsContent value="atividades">
          <ActivitiesTab activities={activities} />
        </TabsContent>

        <TabsContent value="destaques">
          <HighlightsTab highlights={highlights} students={summary?.students ?? []} />
        </TabsContent>

        <TabsContent value="professores">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Professores</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {cls.main_teacher_id && (
                  <Badge variant="default" className="gap-1.5">
                    {teacherMap[cls.main_teacher_id] ?? "—"} <span className="opacity-75">· Principal</span>
                  </Badge>
                )}
                {cls.assignments.map(a => (
                  <Badge key={a.id} variant="secondary" className="gap-1.5 pr-1">
                    {teacherMap[a.teacher_id] ?? "—"}
                    {canEdit && (
                      <button type="button" onClick={() => handleRemoveTeacher(a.id)} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5" title="Remover professor">
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </Badge>
                ))}
                {!cls.main_teacher_id && cls.assignments.length === 0 && (
                  <span className="text-sm text-muted-foreground">Nenhum professor atribuído</span>
                )}
              </div>
              {canEdit && (
                <form onSubmit={handleAddTeacher} className="flex gap-2 pt-1">
                  <Select value={addTeacherId} onValueChange={setAddTeacherId}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Adicionar professor" /></SelectTrigger>
                    <SelectContent>{availableTeachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="submit" size="sm" disabled={saving || !addTeacherId}><UserPlus className="size-4 mr-2" />Adicionar</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// "Hoje": a aula do dia com atalho direto para a chamada, ou um botão para iniciá-la
// Eventos do calendário no dia (feriado em destaque)
function DayEvents({ events, prefix }: { events: CalendarEvent[]; prefix: string }) {
  if (events.length === 0) return null
  return (
    <div className="space-y-2">
      {events.map(ev => {
        const holiday = ev.event_type === "holiday"
        return (
          <div key={ev.id} className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
            holiday ? "border-violet-400 bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200" : "bg-card",
          )}>
            <CalendarDays className="size-4 shrink-0" />
            <span><strong>{prefix}: {EVENT_TYPE_LABEL[ev.event_type ?? ""] ?? "Evento"}</strong> — {ev.title ?? "Sem título"}</span>
          </div>
        )
      })}
    </div>
  )
}

function TodayPanel({ cls, lessons, canManage, canEdit, events }: { cls: Class_; lessons: Lesson[]; canManage: boolean; canEdit: boolean; events: CalendarEvent[] }) {
  const classId = cls.id
  const unitId = cls.unit_id
  const router = useRouter()
  const { user } = useAuth()
  const [starting, setStarting] = useState(false)
  const [attendanceCount, setAttendanceCount] = useState<number | null>(null)

  const now = new Date()
  const active = lessons.filter(l => l.scheduled_at && l.status !== "cancelled")
  const today = active
    .filter(l => sameDay(new Date(l.scheduled_at!), now))
    .sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!))[0]
  const next = active
    .filter(l => new Date(l.scheduled_at!) > now && !sameDay(new Date(l.scheduled_at!), now))
    .sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!))[0]

  const todayEvents = eventsOnDay(events, localDay(now), unitId)
  const nextHoliday = next ? eventsOnDay(events, localDay(next.scheduled_at!), unitId).find(e => e.event_type === "holiday") : undefined
  const todayId = today?.id
  useEffect(() => {
    if (!todayId) return
    lessonsApi.getAttendance(todayId).then(r => setAttendanceCount((r.data as Attendance[]).length)).catch(() => {})
  }, [todayId])

  // Dia de aula pelo horário fixo, mas a aula ainda não existe (turma sem aulas geradas, ou apagada)
  const isScheduledDay = cls.schedule_weekday !== null && weekdayOf(now) === cls.schedule_weekday
  const schedule = formatSchedule(cls)

  async function startLesson() {
    setStarting(true)
    try {
      // No dia fixo, a aula nasce no horário da turma; fora dele, é uma aula avulsa começando agora
      const at = new Date()
      if (isScheduledDay && cls.schedule_start) {
        const [h, m] = cls.schedule_start.split(":").map(Number)
        at.setHours(h, m, 0, 0)
      }
      const { data } = await lessonsApi.create({
        class_id: classId, scheduled_at: at.toISOString(), status: "scheduled", teacher_id: user?.id,
      })
      router.push(`/lessons/${data.id}?tab=attendance`)
    } finally { setStarting(false) }
  }

  if (!today) {
    return (
      <div className="space-y-3">
      <DayEvents events={todayEvents} prefix="Hoje" />
      <Card>
        <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 py-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted"><CalendarClock className="size-6 text-muted-foreground" /></div>
          <div className="flex-1">
            <p className="font-semibold">
              {isScheduledDay ? `Hoje é dia de aula (${fmtHour(cls.schedule_start)}${cls.schedule_end ? `–${fmtHour(cls.schedule_end)}` : ""}), mas ela ainda não foi criada` : "Sem aula hoje"}
            </p>
            <p className="text-sm text-muted-foreground">
              {next ? <>Próxima aula: <Link href={`/lessons/${next.id}`} className="underline">{fmtDateTime(next.scheduled_at)}</Link></> : "Nenhuma aula futura agendada."}
              {nextHoliday && <span className="ml-1 font-medium text-violet-700 dark:text-violet-300">· cai em feriado ({nextHoliday.title})</span>}
            </p>
            {!schedule && canEdit && (
              <p className="text-xs text-muted-foreground mt-1">Dica: defina o dia e horário fixos da turma (em Turmas → editar) para as aulas serem geradas automaticamente.</p>
            )}
          </div>
          {canManage && (
            <Button size="lg" onClick={startLesson} disabled={starting}>
              <PlayCircle className="size-5 mr-2" />{starting ? "Criando…" : isScheduledDay ? "Iniciar aula de hoje" : "Aula avulsa agora"}
            </Button>
          )}
        </CardContent>
      </Card>
      </div>
    )
  }

  const done = (attendanceCount ?? 0) > 0
  return (
    <div className="space-y-3">
    <DayEvents events={todayEvents} prefix="Hoje" />
    <Card className="border-2 border-primary/40">
      <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 py-6">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10"><ClipboardCheck className="size-6 text-primary" /></div>
        <div className="flex-1">
          <p className="font-semibold">Aula de hoje · {fmtTime(today.scheduled_at)}</p>
          <p className={cn("text-sm flex items-center gap-1", done ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
            {attendanceCount === null ? "…" : done ? <><CheckCircle2 className="size-4" />Chamada registrada ({attendanceCount} alunos)</> : "Chamada ainda não feita"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="lg" variant={done ? "outline" : "default"}>
            <Link href={`/lessons/${today.id}?tab=attendance`}><ClipboardCheck className="size-5 mr-2" />{done ? "Revisar chamada" : "Fazer chamada"}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/lessons/${today.id}?tab=report`}><NotebookPen className="size-5 mr-2" />Relatório</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}

function LessonsTab({ cls, lessons, events, canManage, onChange }: { cls: Class_; lessons: Lesson[]; events: CalendarEvent[]; canManage: boolean; onChange: () => Promise<void> }) {
  const router = useRouter()
  const unitId = cls.unit_id
  const [generating, setGenerating] = useState(false)
  const schedule = formatSchedule(cls)
  const sorted = lessons.slice().sort((a, b) => (b.scheduled_at ?? "").localeCompare(a.scheduled_at ?? ""))

  async function generate() {
    setGenerating(true)
    try {
      const { data } = await classesApi.generateLessons(cls.id)
      toast.success(generateResultMessage(data))
      await onChange()
    } finally { setGenerating(false) }
  }

  return (
    <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-muted-foreground flex-1">
        {schedule ? <>Aula semanal: <strong className="text-foreground">{schedule}</strong></> : "Turma sem horário fixo definido."}
      </p>
      {canManage && schedule && (
        <Button variant="outline" size="sm" onClick={generate} disabled={generating}>
          <Repeat className="size-4 mr-2" />{generating ? "Gerando…" : "Gerar aulas"}
        </Button>
      )}
      {canManage && <NewLessonButton cls={cls} onCreated={onChange} />}
    </div>
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow><TableHead className="w-48">Data</TableHead><TableHead className="w-28">Status</TableHead><TableHead>Dever de casa</TableHead><TableHead className="w-24 text-center">Relatório</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(l => {
              const st = LESSON_STATUS[l.status ?? ""]
              return (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => router.push(`/lessons/${l.id}`)}>
                  <TableCell className="font-medium">
                    {fmtDateTime(l.scheduled_at)}
                    {l.scheduled_at && eventsOnDay(events, localDay(l.scheduled_at), unitId).map(ev => (
                      <Badge key={ev.id} variant="outline" className={cn("ml-2 text-xs", ev.event_type === "holiday" && "border-violet-400 text-violet-700 dark:text-violet-300")}>
                        {EVENT_TYPE_LABEL[ev.event_type ?? ""] ?? "Evento"}: {ev.title}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell>{st ? <Badge variant={st.variant}>{st.label}</Badge> : l.status ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{l.report?.homework || "—"}</TableCell>
                  <TableCell className="text-center">{l.report ? <CheckCircle2 className="size-4 text-green-600 inline" aria-label="Relatório preenchido" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                </TableRow>
              )
            })}
            {sorted.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma aula registrada</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </div>
  )
}

function AssessmentsTab({ assessments, studentCount, classId, canManage, onChange }: {
  assessments: Assessment[]; studentCount: number; classId: string; canManage: boolean; onChange: () => Promise<void>
}) {
  const router = useRouter()
  const sorted = assessments.slice().sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
  return (
    <div className="space-y-3">
    {canManage && <div className="flex justify-end"><NewAssessmentButton classId={classId} onCreated={onChange} /></div>}
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Avaliação</TableHead><TableHead className="w-32">Data</TableHead><TableHead className="w-36 text-right">Notas lançadas</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(a => {
              const launched = a.grades?.length ?? 0
              return (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => router.push(`/assessments/${a.id}`)}>
                  <TableCell className="font-medium">{a.title ?? "—"}{a.semester && <span className="text-muted-foreground font-normal"> · {a.semester}</span>}</TableCell>
                  <TableCell>{a.date ? new Date(a.date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", studentCount > 0 && launched < studentCount && "text-amber-600 dark:text-amber-400 font-medium")}>
                    {launched} / {studentCount}
                  </TableCell>
                </TableRow>
              )
            })}
            {sorted.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhuma avaliação nesta turma</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </div>
  )
}

// Próxima data do dia fixo da turma (hoje, se for o dia), para sugerir no formulário
function nextScheduledDay(cls: Class_) {
  const d = new Date()
  if (cls.schedule_weekday !== null) d.setDate(d.getDate() + ((cls.schedule_weekday - weekdayOf(d) + 7) % 7))
  return localDay(d)
}

function NewLessonButton({ cls, onCreated }: { cls: Class_; onCreated: () => Promise<void> }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [saving, setSaving] = useState(false)

  function openDialog() {
    setDate(nextScheduledDay(cls))
    setTime(cls.schedule_start?.slice(0, 5) ?? "")
    setOpen(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await lessonsApi.create({
        class_id: cls.id, scheduled_at: new Date(`${date}T${time || "00:00"}`).toISOString(),
        status: "scheduled", teacher_id: cls.main_teacher_id ?? user?.id,
      })
      toast.success("Aula criada")
      setOpen(false)
      await onCreated()
    } finally { setSaving(false) }
  }

  return (
    <>
      <Button size="sm" onClick={openDialog}><Plus className="size-4 mr-2" />Nova aula</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova aula · {cls.name}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label htmlFor="nl-date">Data</Label><Input id="nl-date" type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
              <div className="space-y-1.5"><Label htmlFor="nl-time">Horário</Label><Input id="nl-time" type="time" value={time} onChange={e => setTime(e.target.value)} required /></div>
            </div>
            <p className="text-xs text-muted-foreground">Use para reposições ou aulas extras. As aulas do horário fixo são geradas automaticamente.</p>
            <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Criando…" : "Criar aula"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Mesmos tipos da tela global de Atividades
const ACTIVITY_TYPE: Record<string, string> = { participation: "Participação", extra: "Extra", event: "Evento", task: "Tarefa" }

function ActivitiesTab({ activities }: { activities: Activity[] }) {
  const sorted = activities.slice().sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Atividade</TableHead><TableHead className="w-36">Tipo</TableHead><TableHead className="w-32">Data</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(a => (
              <TableRow key={a.id}>
                <TableCell>
                  <p className="font-medium">{a.title ?? "—"}</p>
                  {a.description && <p className="text-xs text-muted-foreground line-clamp-1">{a.description}</p>}
                </TableCell>
                <TableCell>{a.type ? <Badge variant="outline">{ACTIVITY_TYPE[a.type] ?? a.type}</Badge> : "—"}</TableCell>
                <TableCell>{a.date ? new Date(a.date).toLocaleDateString("pt-BR") : "—"}</TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhuma atividade nesta turma. <Link href="/activities" className="underline">Criar em Atividades</Link></TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ── Alunos: risco em destaque + ordenação por coluna ────────────────────────────
// Risco (linha vermelha + ⚠): frequência < 60% ou média < 6 (documento de recomendações, REC-TUR-4).
// Atenção (borda âmbar): frequência 60–85% ou média 6–8.
// "Potencial": média ≥ 8 com frequência < 70% — aluno com potencial que não consegue vir.
const RISK_ATTENDANCE = 60

function studentFlags(s: ClassStudentSummary) {
  const hasAtt = s.attendance_total > 0
  const grade = gradeLevel(s.grade_average)
  const reasons: string[] = []
  if (hasAtt && s.attendance_rate < RISK_ATTENDANCE) reasons.push(`frequência de ${formatRate(s.attendance_rate)}`)
  if (grade === "critical") reasons.push(`média ${s.grade_average}`)
  const att = attendanceLevel(s.attendance_rate, s.attendance_total)
  const attention = !reasons.length && (att === "warning" || att === "critical" || grade === "warning")
  const potential = s.grade_average !== null && s.grade_average >= 8 && hasAtt && s.attendance_rate < 70
  return { risk: reasons.length > 0, reasons, attention, potential }
}

type SortKey = "priority" | "name" | "attendance" | "grade"

function StudentsTab({ students }: { students: ClassStudentSummary[] }) {
  const router = useRouter()
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "priority", dir: 1 })

  const rows = students.map(s => ({ ...s, ...studentFlags(s) }))
  const byName = (a: typeof rows[0], b: typeof rows[0]) => (a.full_name ?? "").localeCompare(b.full_name ?? "", "pt-BR")
  // Sem registro vai sempre para o fim, em qualquer direção
  const nullLast = (a: number | null, b: number | null, dir: number) =>
    a === null && b === null ? 0 : a === null ? 1 : b === null ? -1 : (a - b) * dir
  rows.sort((a, b) => {
    switch (sort.key) {
      case "name": return byName(a, b) * sort.dir
      case "attendance": return nullLast(a.attendance_total ? a.attendance_rate : null, b.attendance_total ? b.attendance_rate : null, sort.dir) || byName(a, b)
      case "grade": return nullLast(a.grade_average, b.grade_average, sort.dir) || byName(a, b)
      default: {
        const rank = (r: typeof a) => (r.risk ? 0 : r.attention ? 1 : 2)
        return rank(a) - rank(b) || (a.risk ? a.attendance_rate - b.attendance_rate : 0) || byName(a, b)
      }
    }
  })
  const riskCount = rows.filter(r => r.risk).length

  function header(key: SortKey, label: string, className?: string) {
    const active = sort.key === key
    return (
      <TableHead className={className} aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
        <button
          type="button"
          onClick={() => setSort(cur => cur.key === key ? { key, dir: (cur.dir * -1) as 1 | -1 } : { key, dir: key === "grade" ? -1 : 1 })}
          className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground font-semibold")}
        >
          {label}{active ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
        </button>
      </TableHead>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base mr-auto">Alunos da turma</CardTitle>
          {riskCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              <AlertTriangle className="size-3.5" aria-hidden />{riskCount} em risco
            </span>
          )}
          {sort.key !== "priority" && (
            <button type="button" onClick={() => setSort({ key: "priority", dir: 1 })} className="text-xs text-muted-foreground underline">Em risco primeiro</button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {header("name", "Aluno")}
              {header("attendance", "Frequência", "w-32 text-right")}
              {header("grade", "Média", "w-28 text-right")}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(s => (
              <TableRow
                key={s.student_id}
                onClick={() => router.push(`/students/${s.student_id}`)}
                className={cn(
                  "cursor-pointer",
                  s.risk && "bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 shadow-[inset_4px_0_0_0_var(--color-red-500)]",
                  s.attention && "shadow-[inset_4px_0_0_0_var(--color-amber-400)]",
                )}
              >
                <TableCell className="font-medium">
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {s.risk && (
                      <AlertTriangle className="size-4 text-red-600 dark:text-red-400 shrink-0" aria-label={`Em risco: ${s.reasons.join(" e ")}`}>
                        <title>{`Em risco: ${s.reasons.join(" e ")}`}</title>
                      </AlertTriangle>
                    )}
                    {s.full_name ?? "—"}
                    {s.potential && (
                      <span title="Média alta com frequência baixa: aluno com potencial que tem dificuldade de comparecer. Vale investigar."
                        className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-800 dark:bg-violet-500/20 dark:text-violet-300">
                        ✨ Potencial
                      </span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right"><AttendanceRate rate={s.attendance_rate} total={s.attendance_total} /></TableCell>
                <TableCell className="text-right">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 tabular-nums", GRADE_PILL[gradeLevel(s.grade_average)])}>
                    {gradeLevel(s.grade_average) === "critical" && <TrendingDown className="size-3.5" aria-hidden />}
                    {s.grade_average ?? "—"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum aluno matriculado nesta turma</TableCell></TableRow>}
          </TableBody>
        </Table>
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2 text-[11px] text-muted-foreground border-t">
          <span className="inline-flex items-center gap-1"><AlertTriangle className="size-3 text-red-600" />Em risco: frequência &lt; 60% ou média &lt; 6</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block w-1 h-3 bg-amber-400" />Atenção: frequência 60–85% ou média 6–8</span>
          <span>✨ Potencial: média ≥ 8 com frequência &lt; 70%</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Avaliações: criar direto na turma ───────────────────────────────────────────
const ASSESSMENT_TYPES: [string, string][] = [["written", "Escrita"], ["oral", "Oral"], ["quiz", "Quiz"], ["final", "Final"]]

function NewAssessmentButton({ classId, onCreated }: { classId: string; onCreated: () => Promise<void> }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const semester = () => { const d = new Date(); return `${d.getFullYear()}.${d.getMonth() < 6 ? 1 : 2}` }
  const [form, setForm] = useState({ title: "", type: "written", date: "", max_score: "10", min_score: "4", semester: semester() })
  const F = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const { data } = await assessmentsApi.create({
        class_id: classId, title: form.title, type: form.type, semester: form.semester || undefined,
        date: form.date ? new Date(`${form.date}T12:00`).toISOString() : undefined,
        max_score: form.max_score ? Number(form.max_score) : undefined,
        min_score: form.min_score ? Number(form.min_score) : undefined,
      })
      toast.success("Avaliação criada")
      setOpen(false)
      await onCreated()
      router.push(`/assessments/${data.id}`)  // já abre para lançar as notas
    } finally { setSaving(false) }
  }

  return (
    <>
      <Button size="sm" onClick={() => { setForm(f => ({ ...f, title: "", date: localDay(new Date()) })); setOpen(true) }}>
        <Plus className="size-4 mr-2" />Nova avaliação
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova avaliação</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="na-title">Título</Label><Input id="na-title" value={form.title} onChange={e => F("title", e.target.value)} placeholder="Ex.: Prova 2" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => F("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSESSMENT_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label htmlFor="na-date">Data</Label><Input id="na-date" type="date" value={form.date} onChange={e => F("date", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><Label htmlFor="na-max">Nota máxima</Label><Input id="na-max" type="number" min={1} value={form.max_score} onChange={e => F("max_score", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="na-min">Mínimo p/ aprovação</Label><Input id="na-min" type="number" min={0} step="0.1" value={form.min_score} onChange={e => F("min_score", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="na-sem">Semestre</Label><Input id="na-sem" value={form.semester} onChange={e => F("semester", e.target.value)} /></div>
            </div>
            <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Criando…" : "Criar e lançar notas"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Destaques da turma ─────────────────────────────────────────────────────────
function HighlightsTab({ highlights, students }: { highlights: StudentHighlight[]; students: ClassStudentSummary[] }) {
  const names = Object.fromEntries(students.map(s => [s.student_id, s.full_name]))
  const sorted = highlights.slice().sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button asChild size="sm"><Link href="/highlights"><Plus className="size-4 mr-2" />Novo destaque</Link></Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead className="w-28">Data</TableHead><TableHead>Aluno</TableHead><TableHead className="w-28">Tipo</TableHead><TableHead>Destaque</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(h => (
                <TableRow key={h.id}>
                  <TableCell>{h.created_at ? new Date(h.created_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell className="font-medium"><Link href={`/students/${h.student_id}`} className="hover:underline">{names[h.student_id] ?? "Aluno"}</Link></TableCell>
                  <TableCell><Badge className={highlightBadgeClass(h.highlight_type)}>{HIGHLIGHT_LABEL[h.highlight_type ?? ""] ?? h.highlight_type ?? "—"}</Badge></TableCell>
                  <TableCell>
                    <p>{h.title ?? "—"}</p>
                    {h.description && <p className="text-xs text-muted-foreground line-clamp-1">{h.description}</p>}
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum destaque nesta turma</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
