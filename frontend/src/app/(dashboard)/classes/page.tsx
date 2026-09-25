"use client"

import { useEffect, useRef, useState } from "react"
import { classesApi, unitsApi, usersApi, booksApi } from "@/lib/api"
import type { Class_, Unit, User, Book } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2, Download, Upload, FileSpreadsheet, ExternalLink, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { exportToExcel, downloadTemplate, parseExcel, fmtDate } from "@/lib/excel"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { WEEKDAYS, formatSchedule, generateResultMessage, parseWeekday, parseTime } from "@/lib/schedule"

const COL_DAY = "Dia da aula (segunda…domingo)"
const COL_START = "Início da aula (HH:MM)"
const COL_END = "Fim da aula (HH:MM)"
const CLASS_HEADERS = ["Nome", "Nível (A1/A2/B1/B2/C1/C2)", "Unidade", "Professor (email)", "Livro", "Início (DD/MM/AAAA)", "Fim (DD/MM/AAAA)", COL_DAY, COL_START, COL_END]

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
const EMPTY = { name: "", level: "", unit_id: "", main_teacher_id: "", book_id: "", start_date: "", end_date: "", status: "active", extra_teacher_ids: [] as string[], schedule_weekday: "", schedule_start: "", schedule_end: "" }

// Campos de horário fixo para a API ("" = não informado)
function schedulePayload(f: typeof EMPTY) {
  return {
    schedule_weekday: f.schedule_weekday === "" ? undefined : Number(f.schedule_weekday),
    schedule_start: f.schedule_start || undefined,
    schedule_end: f.schedule_end || undefined,
  }
}

// Com dia e horário definidos, gera as aulas recorrentes e avisa o resultado
async function generateAfterSave(classId: string, f: typeof EMPTY) {
  if (f.schedule_weekday === "" || !f.schedule_start) return
  const { data } = await classesApi.generateLessons(classId)
  toast.success(generateResultMessage(data))
}

export default function ClassesPage() {
  const { canEdit, user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [classes, setClasses] = useState<Class_[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [filterStatus, setFilterStatus] = useState("all")
  // Professor vê primeiro as próprias turmas; pode alternar para todas
  const [onlyMine, setOnlyMine] = useState(true)
  const isTeacher = user?.role === "teacher"
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editClass, setEditClass] = useState<Class_ | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const classParams: Record<string, string> = {}
      if (filterStatus !== "all") classParams.status = filterStatus
      if (isTeacher && onlyMine && user?.id) classParams.teacher_id = user.id
      const [cRes, uRes, bRes] = await Promise.all([
        classesApi.list(classParams), unitsApi.list(), booksApi.list(),
      ])
      setClasses(cRes.data); setUnits(uRes.data); setBooks(bRes.data)
      if (user?.role && user.role !== "teacher") {
        const usrRes = await usersApi.list({ limit: 200 })
        setTeachers(usrRes.data.filter((u: User) => u.role === "teacher" || u.role === "coordinator"))
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterStatus, user?.role, onlyMine])

  function openEdit(c: Class_) {
    setEditClass(c)
    setForm({
      name: c.name ?? "", level: c.level ?? "", unit_id: c.unit_id ?? "", main_teacher_id: c.main_teacher_id ?? "",
      book_id: c.book_id ?? "", start_date: c.start_date ? c.start_date.slice(0, 10) : "", end_date: c.end_date ? c.end_date.slice(0, 10) : "",
      status: c.status ?? "active", extra_teacher_ids: c.assignments.map(a => a.teacher_id),
      schedule_weekday: c.schedule_weekday === null ? "" : String(c.schedule_weekday),
      schedule_start: c.schedule_start?.slice(0, 5) ?? "", schedule_end: c.schedule_end?.slice(0, 5) ?? "",
    })
  }

  function toggleExtraTeacher(id: string) {
    setForm(f => ({
      ...f,
      extra_teacher_ids: f.extra_teacher_ids.includes(id)
        ? f.extra_teacher_ids.filter(x => x !== id)
        : [...f.extra_teacher_ids, id],
    }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const { data } = await classesApi.create({ name: form.name, level: form.level || undefined, unit_id: form.unit_id || undefined, main_teacher_id: form.main_teacher_id || undefined, book_id: form.book_id || undefined, start_date: form.start_date || undefined, end_date: form.end_date || undefined, ...schedulePayload(form) })
      for (const teacherId of form.extra_teacher_ids) {
        await classesApi.addAssignment(data.id, { teacher_id: teacherId })
      }
      await generateAfterSave(data.id, form)
      setCreateOpen(false); setForm({ ...EMPTY }); await load()
    } finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editClass) return; setSaving(true)
    try {
      await classesApi.update(editClass.id, { name: form.name, level: form.level || undefined, unit_id: form.unit_id || undefined, main_teacher_id: form.main_teacher_id || undefined, book_id: form.book_id || undefined, start_date: form.start_date || undefined, end_date: form.end_date || undefined, status: form.status, ...schedulePayload(form) })

      const existingIds = editClass.assignments.map(a => a.teacher_id)
      const toAdd = form.extra_teacher_ids.filter(id => !existingIds.includes(id))
      const toRemove = editClass.assignments.filter(a => !form.extra_teacher_ids.includes(a.teacher_id))
      for (const teacherId of toAdd) await classesApi.addAssignment(editClass.id, { teacher_id: teacherId })
      for (const a of toRemove) await classesApi.removeAssignment(editClass.id, a.id)
      await generateAfterSave(editClass.id, form)

      setEditClass(null); await load()
    } finally { setSaving(false) }
  }

  async function handleDelete(c: Class_) {
    if (!confirm(`Desativar turma "${c.name}"?`)) return
    await classesApi.update(c.id, { status: "inactive" }); await load()
  }

  const F = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))
  const unitMap = Object.fromEntries(units.map(u => [u.id, u.name]))
  const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t.name]))
  const unitNameMap = Object.fromEntries(units.map(u => [u.name?.toLowerCase() ?? "", u.id]))
  const teacherEmailMap = Object.fromEntries(teachers.map(t => [t.email?.toLowerCase() ?? "", t.id]))
  const bookTitleMap = Object.fromEntries(books.map(b => [b.title?.toLowerCase() ?? "", b.id]))

  function handleExport() {
    exportToExcel(classes.map(c => ({
      "Nome": c.name ?? "",
      "Nível (A1/A2/B1/B2/C1/C2)": c.level ?? "",
      "Unidade": c.unit_id ? unitMap[c.unit_id] ?? "" : "",
      "Professor (email)": c.main_teacher_id ? teachers.find(t => t.id === c.main_teacher_id)?.email ?? "" : "",
      "Livro": c.book_id ? books.find(b => b.id === c.book_id)?.title ?? "" : "",
      "Início (DD/MM/AAAA)": c.start_date ? new Date(c.start_date).toLocaleDateString("pt-BR") : "",
      "Fim (DD/MM/AAAA)": c.end_date ? new Date(c.end_date).toLocaleDateString("pt-BR") : "",
      [COL_DAY]: c.schedule_weekday !== null ? WEEKDAYS[c.schedule_weekday] : "",
      [COL_START]: c.schedule_start?.slice(0, 5) ?? "",
      [COL_END]: c.schedule_end?.slice(0, 5) ?? "",
    })), "turmas")
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const rows = await parseExcel(file)
    let ok = 0, fail = 0, lessonsCreated = 0
    const invalid: string[] = []
    for (const [idx, row] of rows.entries()) {
      const name = String(row["Nome"] ?? "").trim()
      if (!name) continue
      // Horário: dia e início vão juntos; valor não reconhecido invalida a linha em vez de importar sem horário
      const weekday = parseWeekday(row[COL_DAY])
      const start = parseTime(row[COL_START])
      const end = parseTime(row[COL_END])
      if (weekday === undefined || start === undefined || end === undefined || (weekday === null) !== (start === null)) {
        invalid.push(`linha ${idx + 2} (${name})`)
        fail++
        continue
      }
      try {
        const { data } = await classesApi.create({
          name,
          level: row["Nível (A1/A2/B1/B2/C1/C2)"] || undefined,
          unit_id: unitNameMap[String(row["Unidade"] ?? "").toLowerCase()] || undefined,
          main_teacher_id: teacherEmailMap[String(row["Professor (email)"] ?? "").toLowerCase()] || undefined,
          book_id: bookTitleMap[String(row["Livro"] ?? "").toLowerCase()] || undefined,
          start_date: fmtDate(row["Início (DD/MM/AAAA)"]),
          end_date: fmtDate(row["Fim (DD/MM/AAAA)"]),
          schedule_weekday: weekday ?? undefined,
          schedule_start: start ?? undefined,
          schedule_end: end ?? undefined,
        })
        ok++
        if (weekday !== null && start) {
          const { data: gen } = await classesApi.generateLessons(data.id)
          lessonsCreated += gen.created
        }
      } catch { fail++ }
    }
    toast.success(`${ok} importado(s)${lessonsCreated ? ` · ${lessonsCreated} aulas geradas` : ""}${fail > 0 ? `, ${fail} com erro` : ""}`)
    if (invalid.length) {
      toast.error(`Dia/horário não reconhecido em ${invalid.join(", ")}. Use ex.: "Sábado", "09:00", "11:00" (dia e início juntos).`, { duration: 10000 })
    }
    await load()
    e.target.value = ""
  }

  const formFields = (isEdit = false) => (
    <div className="space-y-4 mt-2">
      <div className="space-y-1.5"><Label>Nome da turma</Label><Input value={form.name} onChange={e => F("name", e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Nível</Label>
          <Select value={form.level} onValueChange={v => F("level", v)}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Unidade</Label>
          <Select value={form.unit_id} onValueChange={v => F("unit_id", v)}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Professor principal</Label>
        <Select
          value={form.main_teacher_id}
          onValueChange={v => setForm(f => ({ ...f, main_teacher_id: v, extra_teacher_ids: f.extra_teacher_ids.filter(id => id !== v) }))}
        >
          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
          <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Professores adicionais</Label>
        <div className="flex flex-wrap gap-2">
          {teachers.filter(t => t.id !== form.main_teacher_id).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleExtraTeacher(t.id)}
              className={cn(
                "px-3 py-1 rounded-full text-xs border transition-colors",
                form.extra_teacher_ids.includes(t.id)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input text-muted-foreground hover:border-primary"
              )}
            >
              {t.name}
            </button>
          ))}
          {teachers.length === 0 && <span className="text-xs text-muted-foreground">Nenhum professor cadastrado</span>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Livro base</Label>
        <Select value={form.book_id} onValueChange={v => F("book_id", v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
          <SelectContent>{books.map(b => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Início</Label><Input type="date" value={form.start_date} onChange={e => F("start_date", e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Fim</Label><Input type="date" value={form.end_date} onChange={e => F("end_date", e.target.value)} /></div>
      </div>
      <div className="space-y-1.5">
        <Label>Aula semanal</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select value={form.schedule_weekday} onValueChange={v => F("schedule_weekday", v)}>
            <SelectTrigger aria-label="Dia da semana"><SelectValue placeholder="Dia" /></SelectTrigger>
            <SelectContent>{WEEKDAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="time" aria-label="Início" value={form.schedule_start} onChange={e => F("schedule_start", e.target.value)} />
          <Input type="time" aria-label="Fim" value={form.schedule_end} onChange={e => F("schedule_end", e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">As aulas são geradas automaticamente até o fim da turma (ou 16 semanas), pulando feriados do calendário.</p>
      </div>
      {isEdit && (
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => F("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativa</SelectItem>
              <SelectItem value="inactive">Inativa</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Turmas</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-4 mr-2" />Exportar</Button>
          {canEdit && <>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(CLASS_HEADERS, "turmas")}><FileSpreadsheet className="size-4 mr-2" />Modelo</Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="size-4 mr-2" />Importar</Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </>}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          {canEdit && <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Nova turma</Button></DialogTrigger>}
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nova turma</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate}>
              {formFields()}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Criar"}</Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={!!editClass} onOpenChange={o => !o && setEditClass(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar turma</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}>
            {formFields(true)}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditClass(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex gap-3 mb-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="inactive">Inativas</SelectItem>
            <SelectItem value="completed">Concluídas</SelectItem>
          </SelectContent>
        </Select>
        {isTeacher && (
          <Select value={onlyMine ? "mine" : "all"} onValueChange={v => setOnlyMine(v === "mine")}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mine">Minhas turmas</SelectItem>
              <SelectItem value="all">Todas as turmas</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Carregando…</p> : (
        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Nível</TableHead><TableHead>Unidade</TableHead><TableHead className="w-20 text-right">Alunos</TableHead><TableHead>Professor</TableHead><TableHead>Horário</TableHead><TableHead>Período</TableHead><TableHead>Status</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
            <TableBody>
              {classes.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name ?? "—"}</TableCell>
                  <TableCell>{c.level ? <Badge variant="outline">{c.level}</Badge> : "—"}</TableCell>
                  <TableCell>{c.unit_id ? unitMap[c.unit_id] ?? "—" : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.student_count ?? "—"}
                  </TableCell>
                  <TableCell>
                    {c.main_teacher_id
                      ? teacherMap[c.main_teacher_id] ?? "—"
                      : c.assignments.length > 0
                        ? <>{teacherMap[c.assignments[0].teacher_id] ?? "Atribuído"} <span className="text-xs text-muted-foreground">(sem principal)</span></>
                        : c.status === "active"
                          ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                              <AlertTriangle className="size-3.5" aria-hidden />Sem professor
                            </span>
                          )
                          : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">{formatSchedule(c) ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.start_date ? new Date(c.start_date).toLocaleDateString("pt-BR") : "—"}
                    {c.end_date ? ` – ${new Date(c.end_date).toLocaleDateString("pt-BR")}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.status === "active" ? "default" : c.status === "completed" ? "outline" : "secondary"}>
                      {c.status === "active" ? "Ativa" : c.status === "completed" ? "Concluída" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell><div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Ver detalhes" asChild>
                      <Link href={`/classes/${c.id}`}><ExternalLink className="size-4" /></Link>
                    </Button>
                    {canEdit && <>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(c)}><Trash2 className="size-4" /></Button>
                    </>}
                  </div></TableCell>
                </TableRow>
              ))}
              {classes.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma turma cadastrada</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
