"use client"

import { useEffect, useState } from "react"
import { highlightsApi, classesApi, studentsApi } from "@/lib/api"
import type { StudentHighlight, Class_, Student } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus } from "lucide-react"

const TYPE_LABEL: Record<string, string> = { performance: "Desempenho", behavior: "Comportamento", evolution: "Evolução" }
const EMPTY = { student_id: "", class_id: "", title: "", description: "", highlight_type: "performance" }

export default function HighlightsPage() {
  const [highlights, setHighlights] = useState<StudentHighlight[]>([])
  const [classes, setClasses] = useState<Class_[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editHighlight, setEditHighlight] = useState<StudentHighlight | null>(null)
  const [filterClass, setFilterClass] = useState("all")
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const [hRes, cRes, sRes] = await Promise.all([
        highlightsApi.list(filterClass !== "all" ? { class_id: filterClass } : {}),
        classesApi.list(),
        studentsApi.list({}),
      ])
      setHighlights(hRes.data); setClasses(cRes.data); setStudents(sRes.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterClass])

  function openEdit(h: StudentHighlight) {
    setEditHighlight(h)
    setForm({ student_id: h.student_id ?? "", class_id: h.class_id ?? "", title: h.title ?? "", description: h.description ?? "", highlight_type: h.highlight_type ?? "performance" })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try { await highlightsApi.create({ ...form, class_id: form.class_id || undefined }); setCreateOpen(false); setForm({ ...EMPTY }); await load() }
    finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editHighlight) return; setSaving(true)
    try { await highlightsApi.update(editHighlight.id, { title: form.title, description: form.description, highlight_type: form.highlight_type }); setEditHighlight(null); await load() }
    finally { setSaving(false) }
  }

  const F = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]))
  const studentMap = Object.fromEntries(students.map(s => [s.id, s.full_name]))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Destaques de Alunos</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Novo destaque</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar destaque</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Aluno</Label>
                  <Select value={form.student_id} onValueChange={v => F("student_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Turma (opcional)</Label>
                  <Select value={form.class_id} onValueChange={v => F("class_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">—</SelectItem>
                      {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={e => F("title", e.target.value)} required /></div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={form.highlight_type} onValueChange={v => F("highlight_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="performance">Desempenho</SelectItem>
                      <SelectItem value="behavior">Comportamento</SelectItem>
                      <SelectItem value="evolution">Evolução</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Descrição</Label><Input value={form.description} onChange={e => F("description", e.target.value)} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving || !form.student_id}>{saving ? "Salvando…" : "Registrar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editHighlight} onOpenChange={o => !o && setEditHighlight(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar destaque</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={e => F("title", e.target.value)} required /></div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.highlight_type} onValueChange={v => F("highlight_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Desempenho</SelectItem>
                    <SelectItem value="behavior">Comportamento</SelectItem>
                    <SelectItem value="evolution">Evolução</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Descrição</Label><Input value={form.description} onChange={e => F("description", e.target.value)} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditHighlight(null)}>Cancelar</Button>
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
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>Turma</TableHead><TableHead>Título</TableHead><TableHead>Tipo</TableHead><TableHead>Data</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
            <TableBody>
              {highlights.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{studentMap[h.student_id] ?? "—"}</TableCell>
                  <TableCell>{h.class_id ? classMap[h.class_id] ?? "—" : "—"}</TableCell>
                  <TableCell>{h.title ?? "—"}</TableCell>
                  <TableCell>{h.highlight_type ? <Badge variant="outline">{TYPE_LABEL[h.highlight_type] ?? h.highlight_type}</Badge> : "—"}</TableCell>
                  <TableCell>{h.created_at ? new Date(h.created_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit(h)}><Pencil className="size-4" /></Button></TableCell>
                </TableRow>
              ))}
              {highlights.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum destaque registrado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
