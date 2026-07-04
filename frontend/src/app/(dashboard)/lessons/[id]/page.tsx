"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { lessonsApi, classesApi } from "@/lib/api"
import type { Lesson, Attendance, LessonReport, LessonMaterial, Student } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Save } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

const STATUS_LABEL: Record<string, string> = { present: "Presente", absent: "Ausente", late: "Atrasado", justified: "Justificado" }
const ATTENDANCE_OPTS = ["present", "absent", "late", "justified"]

interface AttendanceRow { student_id: string; student_name: string; status: string; notes: string }

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { canEdit } = useAuth()

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [materials, setMaterials] = useState<LessonMaterial[]>([])
  const [report, setReport] = useState<LessonReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
          const [attRes, stuRes] = await Promise.all([
            lessonsApi.getAttendance(id),
            classesApi.getStudents(l.class_id),
          ])
          const attMap = Object.fromEntries(attRes.data.map((a: Attendance) => [a.student_id, a]))
          setStudents(stuRes.data)
          setAttendance(stuRes.data.map((s: Student) => ({
            student_id: s.id,
            student_name: s.full_name ?? "—",
            status: attMap[s.id]?.status ?? "present",
            notes: attMap[s.id]?.notes ?? "",
          })))
        }
      } finally { setLoading(false) }
    }
    load()
  }, [id])

  async function saveAttendance() {
    setSaving(true)
    try {
      await lessonsApi.registerAttendance(id, attendance.map(r => ({ student_id: r.student_id, status: r.status, notes: r.notes || undefined })))
    } finally { setSaving(false) }
  }

  async function saveReport(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const { data } = await lessonsApi.upsertReport(id, reportForm)
      setReport(data)
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

  if (loading) return <p className="text-muted-foreground text-sm p-6">Carregando…</p>
  if (!lesson) return <p className="text-muted-foreground text-sm p-6">Aula não encontrada.</p>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="size-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Aula</h1>
          <p className="text-sm text-muted-foreground">{lesson.scheduled_at ? new Date(lesson.scheduled_at).toLocaleString("pt-BR") : "—"} · <Badge variant={lesson.status === "completed" ? "default" : lesson.status === "cancelled" ? "destructive" : "secondary"}>{lesson.status ?? "—"}</Badge></p>
        </div>
      </div>

      <Tabs defaultValue="attendance">
        <TabsList className="mb-4">
          <TabsTrigger value="attendance">Presença ({students.length})</TabsTrigger>
          <TabsTrigger value="report">Relatório</TabsTrigger>
          <TabsTrigger value="materials">Materiais ({materials.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <div className="rounded-md border bg-card mb-4">
            <Table>
              <TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>Status</TableHead><TableHead>Observação</TableHead></TableRow></TableHeader>
              <TableBody>
                {attendance.map((r, i) => (
                  <TableRow key={r.student_id}>
                    <TableCell className="font-medium">{r.student_name}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={v => canEdit && updateRow(i, "status", v)} disabled={!canEdit}>
                        <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{ATTENDANCE_OPTS.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input className="h-7 text-xs" value={r.notes} onChange={e => updateRow(i, "notes", e.target.value)} placeholder="Observação" disabled={!canEdit} /></TableCell>
                  </TableRow>
                ))}
                {attendance.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Nenhum aluno matriculado nesta turma</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          {attendance.length > 0 && canEdit && (
            <Button onClick={saveAttendance} disabled={saving}>
              <Save className="size-4 mr-2" />{saving ? "Salvando…" : "Salvar presença"}
            </Button>
          )}
        </TabsContent>

        <TabsContent value="report">
          <form onSubmit={saveReport} className="space-y-4 max-w-2xl">
            <div className="space-y-1.5"><Label>Resumo da aula</Label><Input value={reportForm.summary} onChange={e => setReportForm(f => ({ ...f, summary: e.target.value }))} placeholder="O que foi feito…" disabled={!canEdit} /></div>
            <div className="space-y-1.5"><Label>Atividades realizadas</Label><Input value={reportForm.activities_done} onChange={e => setReportForm(f => ({ ...f, activities_done: e.target.value }))} disabled={!canEdit} /></div>
            <div className="space-y-1.5"><Label>Dever de casa</Label><Input value={reportForm.homework} onChange={e => setReportForm(f => ({ ...f, homework: e.target.value }))} disabled={!canEdit} /></div>
            <div className="space-y-1.5"><Label>Observações</Label><Input value={reportForm.observations} onChange={e => setReportForm(f => ({ ...f, observations: e.target.value }))} disabled={!canEdit} /></div>
            {canEdit && <Button type="submit" disabled={saving}><Save className="size-4 mr-2" />{saving ? "Salvando…" : report ? "Atualizar relatório" : "Salvar relatório"}</Button>}
          </form>
        </TabsContent>

        <TabsContent value="materials">
          {canEdit && <form onSubmit={addMaterial} className="flex gap-2 mb-4 items-end">
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
          <div className="rounded-md border bg-card">
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
