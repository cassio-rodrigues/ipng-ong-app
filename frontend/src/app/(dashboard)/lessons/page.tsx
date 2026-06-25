"use client"

import { useEffect, useState } from "react"
import { lessonsApi, classesApi } from "@/lib/api"
import type { Lesson, Class_ } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus } from "lucide-react"

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  completed: "Concluída",
  cancelled: "Cancelada",
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [classes, setClasses] = useState<Class_[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [filterClass, setFilterClass] = useState("all")
  const [form, setForm] = useState({ class_id: "", scheduled_at: "" })
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const [lRes, cRes] = await Promise.all([
        lessonsApi.list(filterClass !== "all" ? { class_id: filterClass } : {}),
        classesApi.list(),
      ])
      setLessons(lRes.data)
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
      await lessonsApi.create(form)
      setOpen(false)
      setForm({ class_id: "", scheduled_at: "" })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Aulas</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-4 mr-2" />Agendar aula</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Agendar aula</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Turma</Label>
                <Select value={form.class_id} onValueChange={v => setForm(f => ({ ...f, class_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar turma" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data e hora</Label>
                <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} required />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving || !form.class_id}>{saving ? "Salvando…" : "Agendar"}</Button>
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
                <TableHead>Turma</TableHead>
                <TableHead>Data agendada</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Relatório</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.class_id ? classMap[l.class_id] ?? "—" : "—"}</TableCell>
                  <TableCell>{l.scheduled_at ? new Date(l.scheduled_at).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={l.status === "completed" ? "default" : l.status === "cancelled" ? "destructive" : "secondary"}>
                      {l.status ? STATUS_LABEL[l.status] ?? l.status : "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {l.report ? <Badge variant="outline">Preenchido</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                </TableRow>
              ))}
              {lessons.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma aula encontrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
