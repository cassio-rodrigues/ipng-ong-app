"use client"

import { useEffect, useState } from "react"
import { classesApi, unitsApi, usersApi, booksApi } from "@/lib/api"
import type { Class_, Unit, User, Book } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2 } from "lucide-react"

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
const EMPTY = { name: "", level: "", unit_id: "", main_teacher_id: "", book_id: "" }

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class_[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editClass, setEditClass] = useState<Class_ | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const [cRes, uRes, usrRes, bRes] = await Promise.all([
        classesApi.list(), unitsApi.list(), usersApi.list({ limit: 200 }), booksApi.list(),
      ])
      setClasses(cRes.data); setUnits(uRes.data)
      setTeachers(usrRes.data.filter((u: User) => u.role === "teacher" || u.role === "coordinator"))
      setBooks(bRes.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openEdit(c: Class_) {
    setEditClass(c)
    setForm({ name: c.name ?? "", level: c.level ?? "", unit_id: c.unit_id ?? "", main_teacher_id: c.main_teacher_id ?? "", book_id: c.book_id ?? "" })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await classesApi.create({ name: form.name, level: form.level || undefined, unit_id: form.unit_id || undefined, main_teacher_id: form.main_teacher_id || undefined, book_id: form.book_id || undefined })
      setCreateOpen(false); setForm({ ...EMPTY }); await load()
    } finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editClass) return; setSaving(true)
    try {
      await classesApi.update(editClass.id, { name: form.name, level: form.level || undefined, unit_id: form.unit_id || undefined, main_teacher_id: form.main_teacher_id || undefined, book_id: form.book_id || undefined })
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

  const FormFields = () => (
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
        <Select value={form.main_teacher_id} onValueChange={v => F("main_teacher_id", v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
          <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Livro</Label>
        <Select value={form.book_id} onValueChange={v => F("book_id", v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
          <SelectContent>{books.map(b => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Turmas</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Nova turma</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova turma</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate}><FormFields />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Criar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editClass} onOpenChange={o => !o && setEditClass(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar turma</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}><FormFields />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditClass(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? <p className="text-muted-foreground text-sm">Carregando…</p> : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Nível</TableHead><TableHead>Unidade</TableHead><TableHead>Professor</TableHead><TableHead>Status</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
            <TableBody>
              {classes.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name ?? "—"}</TableCell>
                  <TableCell>{c.level ? <Badge variant="outline">{c.level}</Badge> : "—"}</TableCell>
                  <TableCell>{c.unit_id ? unitMap[c.unit_id] ?? "—" : "—"}</TableCell>
                  <TableCell>{c.main_teacher_id ? teacherMap[c.main_teacher_id] ?? "—" : "—"}</TableCell>
                  <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status === "active" ? "Ativa" : "Inativa"}</Badge></TableCell>
                  <TableCell><div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(c)}><Trash2 className="size-4" /></Button>
                  </div></TableCell>
                </TableRow>
              ))}
              {classes.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma turma cadastrada</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
