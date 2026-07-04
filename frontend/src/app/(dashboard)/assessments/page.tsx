"use client"

import { useEffect, useRef, useState } from "react"
import { assessmentsApi, classesApi } from "@/lib/api"
import type { Assessment, Class_ } from "@/types"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExternalLink, Pencil, Plus, Download, Upload, FileSpreadsheet } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { exportToExcel, downloadTemplate, parseExcel, fmtDateTime } from "@/lib/excel"
import { toast } from "sonner"

const ASSESSMENT_HEADERS = ["Título", "Turma (nome)", "Tipo (written/oral/quiz/final)", "Semestre", "Nota máxima", "Data (DD/MM/AAAA HH:MM)"]
const TYPE_OPTS = [
  { value: "written", label: "Escrita" },
  { value: "oral", label: "Oral" },
  { value: "quiz", label: "Quiz" },
  { value: "final", label: "Exame Final" },
]
const today = () => new Date().toISOString().slice(0, 10)
const getEmpty = () => ({ title: "", class_id: "", type: "", semester: "", max_score: "10", date: `${today()}T00:00` })

export default function AssessmentsPage() {
  const { canEdit, isTeacher, user } = useAuth()
  const canManage = canEdit || isTeacher
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [classes, setClasses] = useState<Class_[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editAssessment, setEditAssessment] = useState<Assessment | null>(null)
  const [filterClass, setFilterClass] = useState("all")
  const [form, setForm] = useState(getEmpty())
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const classParams = isTeacher && user?.id ? { teacher_id: user.id } : {}
      const [aRes, cRes] = await Promise.all([
        assessmentsApi.list(filterClass !== "all" ? { class_id: filterClass } : {}),
        classesApi.list(classParams),
      ])
      setAssessments(aRes.data); setClasses(cRes.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterClass])

  function openEdit(a: Assessment) {
    setEditAssessment(a)
    setForm({ title: a.title ?? "", class_id: a.class_id ?? "", type: a.type ?? "", semester: a.semester ?? "", max_score: String(a.max_score ?? 10), date: a.date ? a.date.slice(0, 16) : "" })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try { await assessmentsApi.create({ ...form, max_score: Number(form.max_score) }); setCreateOpen(false); setForm(getEmpty()); await load() }
    finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editAssessment) return; setSaving(true)
    try { await assessmentsApi.update(editAssessment.id, { ...form, max_score: Number(form.max_score) }); setEditAssessment(null); await load() }
    finally { setSaving(false) }
  }

  const F = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]))
  const classNameMap = Object.fromEntries(classes.map(c => [(c.name ?? "").toLowerCase(), c.id]))

  function handleExport() {
    exportToExcel(assessments.map(a => ({
      "Título": a.title ?? "",
      "Turma (nome)": a.class_id ? classMap[a.class_id] ?? "" : "",
      "Tipo (written/oral/quiz/final)": a.type ?? "",
      "Semestre": a.semester ?? "",
      "Nota máxima": a.max_score ?? "",
      "Data (DD/MM/AAAA HH:MM)": a.date ? new Date(a.date).toLocaleString("pt-BR") : "",
    })), "avaliacoes")
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
        await assessmentsApi.create({
          title,
          class_id,
          type: row["Tipo (written/oral/quiz/final)"] || undefined,
          semester: row["Semestre"] || undefined,
          max_score: row["Nota máxima"] ? Number(row["Nota máxima"]) : 10,
          date: fmtDateTime(row["Data (DD/MM/AAAA HH:MM)"]),
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
      <div className="space-y-1.5">
        <Label>Turma</Label>
        <Select value={form.class_id} onValueChange={v => F("class_id", v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
          <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={form.type} onValueChange={v => F("type", v)}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>{TYPE_OPTS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Semestre</Label>
          <Select value={form.semester} onValueChange={v => F("semester", v)}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2026.1">2026.1</SelectItem>
              <SelectItem value="2026.2">2026.2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Nota máxima</Label><Input type="number" min={1} value={form.max_score} onChange={e => F("max_score", e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Data</Label><Input type="datetime-local" value={form.date} onChange={e => F("date", e.target.value)} /></div>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Avaliações</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-4 mr-2" />Exportar</Button>
          {canManage && <>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(ASSESSMENT_HEADERS, "avaliacoes")}><FileSpreadsheet className="size-4 mr-2" />Modelo</Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="size-4 mr-2" />Importar</Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </>}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            {canManage && <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Nova avaliação</Button></DialogTrigger>}
            <DialogContent>
              <DialogHeader><DialogTitle>Nova avaliação</DialogTitle></DialogHeader>
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

      <Dialog open={!!editAssessment} onOpenChange={o => !o && setEditAssessment(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar avaliação</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}>
            {formFields()}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditAssessment(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
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
            <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Turma</TableHead><TableHead>Tipo</TableHead><TableHead>Semestre</TableHead><TableHead>Nota max.</TableHead><TableHead>Notas</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
            <TableBody>
              {assessments.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title ?? "—"}</TableCell>
                  <TableCell>{a.class_id ? classMap[a.class_id] ?? "—" : "—"}</TableCell>
                  <TableCell>{a.type ?? "—"}</TableCell>
                  <TableCell>{a.semester ?? "—"}</TableCell>
                  <TableCell>{a.max_score ?? "—"}</TableCell>
                  <TableCell>{a.grades?.length ?? 0}</TableCell>
                  <TableCell><div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Ver notas" asChild>
                      <Link href={`/assessments/${a.id}`}><ExternalLink className="size-4" /></Link>
                    </Button>
                    {canManage && <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="size-4" /></Button>}
                  </div></TableCell>
                </TableRow>
              ))}
              {assessments.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma avaliação encontrada</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
