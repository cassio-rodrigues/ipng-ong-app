"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { lessonsApi, classesApi, calendarApi } from "@/lib/api"
import { eventsOnDay, localDay, EVENT_TYPE_LABEL } from "@/lib/calendar"
import type { Lesson, Attendance, LessonReport, LessonMaterial, Student, Class_, CalendarEvent, HomeworkStatus } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Save, CalendarDays, CheckCheck, Check, X, Minus, NotebookPen } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useAlerts, notifyAlertsChanged } from "@/hooks/use-alerts"
import { AlertList } from "@/components/shared/AlertList"

const STATUS_LABEL: Record<string, string> = { present: "Presente", absent: "Ausente", late: "Atrasado", justified: "Justificado" }
const ATTENDANCE_OPTS = ["present", "absent", "late", "justified"]

interface AttendanceRow { student_id: string; student_name: string; status: string; notes: string; homework_status: HomeworkStatus | null }
interface PrevHomework { lesson_id: string; scheduled_at: string | null; homework: string }

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const initialTab = useSearchParams().get("tab") ?? "attendance"
  const { canEdit, isTeacher } = useAuth()
  const canManage = canEdit || isTeacher
  // Dever de casa da aula anterior que precisa ser checado nesta aula
  const { alerts } = useAlerts({ lesson_id: id })

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [cls, setCls] = useState<Class_ | null>(null)
  const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([])
  // Dever passado na aula anterior da turma, checado aluno a aluno nesta chamada
  const [prevHomework, setPrevHomework] = useState<PrevHomework | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [materials, setMaterials] = useState<LessonMaterial[]>([])
  const [report, setReport] = useState<LessonReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [reportForm, setReportForm] = useState({ summary: "", activities_done: "", homework: "", observations: "" })
  const [materialForm, setMaterialForm] = useState({ type: "link", title: "", content: "" })

  useEffect(() => {
    async function load() {
      try {
        const { data: l } = await lessonsApi.get(id)
        setLesson(l)
        setMaterials(l.materials ?? [])
        setReport(l.report ?? null)
        if (l.report) setReportForm({ summary: l.report.summary ?? "", activities_done: l.report.activities_done ?? "", homework: l.report.homework ?? "", observations: l.report.observations ?? "" })

        if (l.class_id) {
          const [attRes, stuRes, clsRes, lessonsRes] = await Promise.all([
            lessonsApi.getAttendance(id),
            classesApi.getStudents(l.class_id),
            classesApi.get(l.class_id),
            lessonsApi.list({ class_id: l.class_id }),
          ])
          setCls(clsRes.data)
          if (l.scheduled_at) {
            const prev = (lessonsRes.data as Lesson[])
              .filter(x => x.id !== l.id && x.status !== "cancelled" && x.scheduled_at && x.scheduled_at < l.scheduled_at!)
              .sort((a, b) => b.scheduled_at!.localeCompare(a.scheduled_at!))[0]
            const hw = prev?.report?.homework?.trim()
            setPrevHomework(prev && hw ? { lesson_id: prev.id, scheduled_at: prev.scheduled_at, homework: hw } : null)
          }
          if (l.scheduled_at) {
            // Eventos do calendário no dia da aula (ex.: feriado)
            const day = localDay(l.scheduled_at)
            const prev = new Date(l.scheduled_at); prev.setDate(prev.getDate() - 31)
            calendarApi.list({ start_date: localDay(prev) + "T00:00:00", limit: 500 })
              .then(r => setDayEvents(eventsOnDay(r.data, day, clsRes.data.unit_id)))
              .catch(() => {})
          }
          const attMap = Object.fromEntries(attRes.data.map((a: Attendance) => [a.student_id, a]))
          setStudents(stuRes.data)
          setAttendance(stuRes.data.map((s: Student) => ({
            student_id: s.id,
            student_name: s.full_name ?? "—",
            status: attMap[s.id]?.status ?? "present",
            notes: attMap[s.id]?.notes ?? "",
            homework_status: attMap[s.id]?.homework_status ?? null,
          })))
        }
      } finally { setLoading(false) }
    }
    load()
  }, [id])

  async function saveAttendance(rows: AttendanceRow[] = attendance) {
    setSaving(true)
    try {
      await lessonsApi.registerAttendance(id, rows.map(r => ({
        student_id: r.student_id, status: r.status, notes: r.notes || undefined,
        homework_status: prevHomework ? r.homework_status : undefined,
      })))
      const absent = rows.filter(r => r.status === "absent").length
      const hwChecked = prevHomework ? rows.filter(r => r.homework_status !== null).length : 0
      toast.success(`Presença salva · ${rows.length - absent} presentes, ${absent} ${absent === 1 ? "falta" : "faltas"}${hwChecked ? ` · dever checado de ${hwChecked}` : ""}`)
      notifyAlertsChanged()
    } finally { setSaving(false) }
  }

  async function saveReport(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const { data } = await lessonsApi.upsertReport(id, reportForm)
      setReport(data)
      toast.success("Relatório salvo")
    } finally { setSaving(false) }
  }

  async function addMaterial(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const { data } = await lessonsApi.addMaterial(id, materialForm)
      setMaterials(m => [...m, data])
      setMaterialForm({ type: "link", title: "", content: "" })
    } finally { setSaving(false) }
  }

  const updateRow = (i: number, k: "status" | "notes", v: string) =>
    setAttendance(rows => rows.map((r, j) => j === i ? { ...r, [k]: v } : r))
  // Clicar de novo na opção marcada volta para "não verificado"
  const setHomework = (i: number, v: HomeworkStatus) =>
    setAttendance(rows => rows.map((r, j) => j === i ? { ...r, homework_status: r.homework_status === v ? null : v } : r))

  // Um clique: todos presentes e já salva. Exceções podem ser ajustadas e salvas de novo.
  async function markAllPresent() {
    const rows = attendance.map(r => ({ ...r, status: "present" }))
    setAttendance(rows)
    setSelected(new Set())
    await saveAttendance(rows)
  }

  const allSelected = attendance.length > 0 && selected.size === attendance.length
  const someSelected = selected.size > 0 && !allSelected

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(attendance.map(r => r.student_id)))
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function setStatusForSelected(status: string) {
    setAttendance(rows => rows.map(r => selected.has(r.student_id) ? { ...r, status } : r))
  }

  if (loading) return <p className="text-muted-foreground text-sm p-6">Carregando…</p>
  if (!lesson) return <p className="text-muted-foreground text-sm p-6">Aula não encontrada.</p>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="size-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold">
            Aula{cls && <> · <Link href={`/classes/${cls.id}?tab=hoje`} className="hover:underline">{cls.name}</Link></>}
          </h1>
          <p className="text-sm text-muted-foreground">{lesson.scheduled_at ? new Date(lesson.scheduled_at).toLocaleString("pt-BR") : "—"} · <Badge variant={lesson.status === "completed" ? "default" : lesson.status === "cancelled" ? "destructive" : "secondary"}>{lesson.status ?? "—"}</Badge></p>
        </div>
      </div>

      {dayEvents.length > 0 && (
        <div className="mb-4 space-y-2">
          {dayEvents.map(ev => (
            <div key={ev.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${ev.event_type === "holiday" ? "border-violet-400 bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200" : "bg-card"}`}>
              <CalendarDays className="size-4 shrink-0" />
              <span><strong>{EVENT_TYPE_LABEL[ev.event_type ?? ""] ?? "Evento"} neste dia</strong> — {ev.title ?? "Sem título"}</span>
            </div>
          ))}
        </div>
      )}

      {alerts.length > 0 && (
        <div className="mb-6">
          <AlertList alerts={alerts} hideClass emptyText={null} />
        </div>
      )}

      <Tabs defaultValue={initialTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="attendance">Presença ({students.length})</TabsTrigger>
          <TabsTrigger value="report">Relatório</TabsTrigger>
          <TabsTrigger value="materials">Materiais ({materials.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          {canManage && selected.size > 0 && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-muted border text-sm">
              <span className="text-muted-foreground mr-1">{selected.size} selecionado(s):</span>
              {ATTENDANCE_OPTS.map(s => (
                <Button key={s} size="sm" variant="outline" className="h-7 text-xs" onClick={() => setStatusForSelected(s)}>
                  {STATUS_LABEL[s]}
                </Button>
              ))}
              <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => setSelected(new Set())}>
                Limpar seleção
              </Button>
            </div>
          )}

          {canManage && attendance.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Button onClick={markAllPresent} disabled={saving} size="lg">
                <CheckCheck className="size-5 mr-2" />Todos presentes
              </Button>
              <span className="text-xs text-muted-foreground">Marca todos como presentes e salva. Depois é só ajustar quem faltou.</span>
            </div>
          )}

          {prevHomework && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
              <NotebookPen className="size-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <strong>Dever da aula anterior{prevHomework.scheduled_at && ` (${new Date(prevHomework.scheduled_at).toLocaleDateString("pt-BR")})`}:</strong> {prevHomework.homework}
                <span className="block text-xs opacity-80">Marque na coluna “Homework”: Fez, Não fez ou N/A (não se aplica). Registrar qualquer opção conclui a pendência de checagem.</span>
              </div>
              {canManage && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAttendance(rows => rows.map(r => ({ ...r, homework_status: r.status === "absent" ? "na" : "done" })))}>
                  Todos fizeram
                </Button>
              )}
            </div>
          )}

          <div className="rounded-md border bg-card mb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  {canManage && (
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                        checked={allSelected}
                        ref={el => { if (el) el.indeterminate = someSelected }}
                        onChange={toggleAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Aluno</TableHead>
                  <TableHead>Status</TableHead>
                  {prevHomework && <TableHead className="w-56">Homework</TableHead>}
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((r, i) => (
                  <TableRow key={r.student_id} className={selected.has(r.student_id) ? "bg-muted/50" : ""}>
                    {canManage && (
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                          checked={selected.has(r.student_id)}
                          onChange={() => toggleOne(r.student_id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{r.student_name}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={v => canManage && updateRow(i, "status", v)} disabled={!canManage}>
                        <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{ATTENDANCE_OPTS.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    {prevHomework && (
                      <TableCell>
                        <div className="inline-flex rounded-md border overflow-hidden text-xs font-medium" role="radiogroup" aria-label={`Homework de ${r.student_name}`}>
                          {([
                            ["done", "Fez", Check, "bg-green-600 text-white"],
                            ["not_done", "Não fez", X, "bg-red-600 text-white"],
                            ["na", "N/A", Minus, "bg-slate-500 text-white"],
                          ] as const).map(([value, label, Icon, active], k) => (
                            <button
                              key={label} type="button" role="radio" disabled={!canManage}
                              aria-checked={r.homework_status === value}
                              onClick={() => setHomework(i, value)}
                              className={cn("inline-flex items-center gap-1 px-2.5 py-1.5 min-h-9", k > 0 && "border-l", r.homework_status === value ? active : "hover:bg-muted")}
                            >
                              <Icon className="size-4" /><span className="hidden sm:inline">{label}</span>
                            </button>
                          ))}
                        </div>
                      </TableCell>
                    )}
                    <TableCell><Input className="h-7 text-xs" value={r.notes} onChange={e => updateRow(i, "notes", e.target.value)} placeholder="Observação" disabled={!canManage} /></TableCell>
                  </TableRow>
                ))}
                {attendance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={(canManage ? 4 : 3) + (prevHomework ? 1 : 0)} className="text-center text-muted-foreground py-6">
                      Nenhum aluno matriculado nesta turma
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {attendance.length > 0 && canManage && (
            <Button onClick={() => saveAttendance()} disabled={saving}>
              <Save className="size-4 mr-2" />{saving ? "Salvando…" : "Salvar presença"}
            </Button>
          )}
        </TabsContent>

        <TabsContent value="report">
          <form onSubmit={saveReport} className="space-y-4 max-w-2xl">
            <div className="space-y-1.5"><Label>Resumo da aula</Label><Input value={reportForm.summary} onChange={e => setReportForm(f => ({ ...f, summary: e.target.value }))} placeholder="O que foi feito…" disabled={!canManage} /></div>
            <div className="space-y-1.5"><Label>Atividades realizadas</Label><Input value={reportForm.activities_done} onChange={e => setReportForm(f => ({ ...f, activities_done: e.target.value }))} disabled={!canManage} /></div>
            <div className="space-y-1.5"><Label>Dever de casa</Label><Input value={reportForm.homework} onChange={e => setReportForm(f => ({ ...f, homework: e.target.value }))} disabled={!canManage} /></div>
            <div className="space-y-1.5"><Label>Observações</Label><Input value={reportForm.observations} onChange={e => setReportForm(f => ({ ...f, observations: e.target.value }))} disabled={!canManage} /></div>
            {canManage && <Button type="submit" disabled={saving}><Save className="size-4 mr-2" />{saving ? "Salvando…" : report ? "Atualizar relatório" : "Salvar relatório"}</Button>}
          </form>
        </TabsContent>

        <TabsContent value="materials">
          {canManage && <form onSubmit={addMaterial} className="flex gap-2 mb-4 items-end">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={materialForm.type} onValueChange={v => setMaterialForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="file">Arquivo</SelectItem>
                  <SelectItem value="text">Texto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex-1"><Label>Título</Label><Input value={materialForm.title} onChange={e => setMaterialForm(f => ({ ...f, title: e.target.value }))} required /></div>
            <div className="space-y-1.5 flex-1"><Label>Conteúdo / URL</Label><Input value={materialForm.content} onChange={e => setMaterialForm(f => ({ ...f, content: e.target.value }))} /></div>
            <Button type="submit" disabled={saving}>Adicionar</Button>
          </form>}
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Título</TableHead><TableHead>Conteúdo</TableHead></TableRow></TableHeader>
              <TableBody>
                {materials.map(m => (
                  <TableRow key={m.id}>
                    <TableCell><Badge variant="outline">{m.type ?? "—"}</Badge></TableCell>
                    <TableCell className="font-medium">{m.title ?? "—"}</TableCell>
                    <TableCell className="max-w-sm truncate text-xs text-muted-foreground">{m.content ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {materials.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Nenhum material adicionado</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
