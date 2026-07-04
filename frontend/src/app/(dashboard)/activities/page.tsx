"use client"

import { useEffect, useRef, useState } from "react"
import { activitiesApi, classesApi } from "@/lib/api"
import type { Activity, Class_, Student } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Users, Download, Upload, FileSpreadsheet } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { exportToExcel, downloadTemplate, parseExcel, fmtDateTime } from "@/lib/excel"
import { toast } from "sonner"

const ACTIVITY_HEADERS = ["Título", "Turma (nome)", "Tipo (participation/extra/event/task)", "Data (DD/MM/AAAA HH:MM)", "Descrição"]
const TYPE_LABEL: Record<string, string> = { participation: "Participação", extra: "Extra", event: "Evento", task: "Tarefa" }
const STATUS_OPTIONS = ["participated", "completed", "absent"]
const STATUS_LABEL: Record<string, string> = { participated: "Participou", completed: "Concluiu", absent: "Faltou" }
const today = () => new Date().toISOString().slice(0, 10)
const getEmpty = () => ({ title: "", class_id: "", type: "participation", description: "", date: `${today()}T00:00` })

interface Response { student_id: string; status: string; score: string; notes: string }

export default function ActivitiesPage() {
  const { canEdit, isTeacher, user } = useAuth()
  const canManage = canEdit || isTeacher
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [classes, setClasses] = useState<Class_[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editActivity, setEditActivity] = useState<Activity | null>(null)
  const [responseActivity, setResponseActivity] = useState<Activity | null>(null)
  const [responseStudents, setResponseStudents] = useState<Student[]>([])
  const [responses, setResponses] = useState<Response[]>([])
  const [filterClass, setFilterClass] = useState("all")
  const [form, setForm] = useState(getEmpty())
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const classParams = isTeacher && user?.id ? { teacher_id: user.id } : {}
      const [aRes, cRes] = await Promise.all([
        activitiesApi.list(filterClass !== "all" ? { class_id: filterClass } : {}),
        classesApi.list(classParams),
      ])
      setActivities(aRes.data); setClasses(cRes.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterClass])

  function openEdit(a: Activity) {
    setEditActivity(a)
    setForm({ title: a.title ?? "", class_id: a.class_id ?? "", type: a.type ?? "participation", description: a.description ?? "", date: a.date ? a.date.slice(0, 16) : "" })
  }

  async function openResponses(a: Activity) {
    setResponseActivity(a)
    if (a.class_id) {
      const { data } = await classesApi.getStudents(a.class_id)
      setResponseStudents(data)
      setResponses(data.map((s: Student) => ({ student_id: s.id, status: "participated", score: "", notes: "" })))
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try { await activitiesApi.create({ ...form, date: form.date || undefined }); setCreateOpen(false); setForm(getEmpty()); await load() }
    finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editActivity) return; setSaving(true)
    try { await activitiesApi.update(editActivity.id, { ...form, date: form.date || undefined }); setEditActivity(null); await load() }
    finally { setSaving(false) }
  }

  async function handleSaveResponses(e: React.FormEvent) {
    e.preventDefault(); if (!responseActivity) return; setSaving(true)
    try {
      await activitiesApi.postResponses(responseActivity.id, responses.map(r => ({ ...r, score: r.score ? Number(r.score) : undefined, notes: r.notes || undefined })))
      setResponseActivity(null)
    } finally { setSaving(false) }
  }

  const F = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]))
  const classNameMap = Object.fromEntries(classes.map(c => [(c.name ?? "").toLowerCase(), c.id]))
  const studentMap = Object.fromEntries(responseStudents.map(s => [s.id, s.full_name]))

  function handleExport() {
    exportToExcel(activities.map(a => ({
      "Título": a.title ?? "",
      "Turma (nome)": a.class_id ? classMap[a.class_id] ?? "" : "",
      "Tipo (participation/extra/event/task)": a.type ?? "",
      "Data (DD/MM/AAAA HH:MM)": a.date ? new Date(a.date).toLocaleString("pt-BR") : "",
      "Descrição": a.description ?? "",
    })), "atividades")
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const rows = await parseExcel(file)
    let ok = 0, fail = 0
    for (const row of rows) {
      const title = String(row["Título"] ?? "").trim()
      const class_id = classNameMap[String(row["Turma (nome)"] ?? "").toLowerCase()]
      if (!title || !class_id) { fail++; continue }
      try {
        await activitiesApi.create({
          title,
          class_id,
          type: row["Tipo (participation/extra/event/task)"] || "participation",
          date: fmtDateTime(row["Data (DD/MM/AAAA HH:MM)"]),
          description: row["Descrição"] || undefined,
        })
        ok++
      } catch { fail++ }
    }
    toast.success(`${ok} importado(s)${fail > 0 ? `, ${fail} com erro` : ""}`)
    await load()
    e.target.value = ""
  }

  const formFields = () => (
    <div className="space-y-4 mt-2">
      <div className="space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={e => F("title", e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Turma</Label>
          <Select value={form.class_id} onValueChange={v => F("class_id", v)}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={form.type} onValueChange={v => F("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="participation">Participação</SelectItem>
              <SelectItem value="extra">Extra</SelectItem>
              <SelectItem value="event">Evento</SelectItem>
              <SelectItem value="task">Tarefa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label>Data</Label><Input type="datetime-local" value={form.date} onChange={e => F("date", e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Descrição</Label><Input value={form.description} onChange={e => F("description", e.target.value)} /></div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Atividades</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-4 mr-2" />Exportar</Button>
          {canManage && <>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(ACTIVITY_HEADERS, "atividades")}><FileSpreadsheet className="size-4 mr-2" />Modelo</Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="size-4 mr-2" />Importar</Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </>}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            {canManage && <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Nova atividade</Button></DialogTrigger>}
            <DialogContent>
              <DialogHeader><DialogTitle>Nova atividade</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate}>
                {formFields()}
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={saving || !form.class_id}>{saving ? "Salvando…" : "Criar"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={!!editActivity} onOpenChange={o => !o && setEditActivity(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar atividade</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}>
            {formFields()}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditActivity(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!responseActivity} onOpenChange={o => !o && setResponseActivity(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Participação — {responseActivity?.title}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveResponses}>
            <div className="mt-2 rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Pontuação</TableHead><TableHead>Obs.</TableHead></TableRow></TableHeader>
                <TableBody>
                  {responses.map((r, i) => (
                    <TableRow key={r.student_id}>
                      <TableCell>{studentMap[r.student_id] ?? "—"}</TableCell>
                      <TableCell>
                        <Select value={r.status} onValueChange={v => setResponses(rs => rs.map((x, j) => j === i ? { ...x, status: v } : x))}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input className="h-7 text-xs" type="number" value={r.score} onChange={e => setResponses(rs => rs.map((x, j) => j === i ? { ...x, score: e.target.value } : x))} /></TableCell>
                      <TableCell><Input className="h-7 text-xs" value={r.notes} onChange={e => setResponses(rs => rs.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} /></TableCell>
                    </TableRow>
                  ))}
                  {responses.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Nenhum aluno matriculado</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setResponseActivity(null)}>Fechar</Button>
              {canManage && <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar participação"}</Button>}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex gap-4 mb-4">
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Filtrar por turma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Carregando…</p> : (
        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Turma</TableHead><TableHead>Tipo</TableHead><TableHead>Data</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
            <TableBody>
              {activities.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title ?? "—"}</TableCell>
                  <TableCell>{a.class_id ? classMap[a.class_id] ?? "—" : "—"}</TableCell>
                  <TableCell>{a.type ? <Badge variant="outline">{TYPE_LABEL[a.type] ?? a.type}</Badge> : "—"}</TableCell>
                  <TableCell>{a.date ? new Date(a.date).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell><div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Participação" onClick={() => openResponses(a)}><Users className="size-4" /></Button>
                    {canManage && <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="size-4" /></Button>}
                  </div></TableCell>
                </TableRow>
              ))}
              {activities.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma atividade cadastrada</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
