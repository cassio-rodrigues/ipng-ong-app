"use client"

import { useEffect, useState } from "react"
import { assessmentsApi, classesApi } from "@/lib/api"
import type { Assessment, Class_ } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus } from "lucide-react"

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [classes, setClasses] = useState<Class_[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [filterClass, setFilterClass] = useState("all")
  const [form, setForm] = useState({ title: "", class_id: "", type: "", semester: "", max_score: "10", date: "" })
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const [aRes, cRes] = await Promise.all([
        assessmentsApi.list(filterClass !== "all" ? { class_id: filterClass } : {}),
        classesApi.list(),
      ])
      setAssessments(aRes.data)
      setClasses(cRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterClass])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await assessmentsApi.create({ ...form, max_score: Number(form.max_score) })
      setOpen(false)
      setForm({ title: "", class_id: "", type: "", semester: "", max_score: "10", date: "" })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Avaliações</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-4 mr-2" />Nova avaliação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova avaliação</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Turma</Label>
                <Select value={form.class_id} onValueChange={v => setForm(f => ({ ...f, class_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="written">Escrita</SelectItem>
                      <SelectItem value="oral">Oral</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Semestre</Label>
                  <Select value={form.semester} onValueChange={v => setForm(f => ({ ...f, semester: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2026.1">2026.1</SelectItem>
                      <SelectItem value="2026.2">2026.2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nota máxima</Label>
                  <Input type="number" min={1} value={form.max_score} onChange={e => setForm(f => ({ ...f, max_score: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Data</Label>
                  <Input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving || !form.class_id}>{saving ? "Salvando…" : "Criar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 mb-4">
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Filtrar por turma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Semestre</TableHead>
                <TableHead>Nota max.</TableHead>
                <TableHead>Notas lançadas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title ?? "—"}</TableCell>
                  <TableCell>{a.class_id ? classMap[a.class_id] ?? "—" : "—"}</TableCell>
                  <TableCell>{a.type ?? "—"}</TableCell>
                  <TableCell>{a.semester ?? "—"}</TableCell>
                  <TableCell>{a.max_score ?? "—"}</TableCell>
                  <TableCell>{a.grades?.length ?? 0}</TableCell>
                </TableRow>
              ))}
              {assessments.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma avaliação encontrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
