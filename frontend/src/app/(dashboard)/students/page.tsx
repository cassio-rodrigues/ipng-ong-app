"use client"

import { useEffect, useState } from "react"
import { studentsApi, unitsApi } from "@/lib/api"
import type { Student, Unit } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2 } from "lucide-react"

const EMPTY = { full_name: "", email: "", phone: "", gender: "", unit_id: "" }

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [filterUnit, setFilterUnit] = useState("all")
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const [sRes, uRes] = await Promise.all([
        studentsApi.list(filterUnit !== "all" ? { unit_id: filterUnit } : {}),
        unitsApi.list(),
      ])
      setStudents(sRes.data); setUnits(uRes.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterUnit])

  function openEdit(s: Student) {
    setEditStudent(s)
    setForm({ full_name: s.full_name ?? "", email: s.email ?? "", phone: s.phone ?? "", gender: s.gender ?? "", unit_id: s.unit_id ?? "" })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await studentsApi.create({ ...form, unit_id: form.unit_id || undefined })
      setCreateOpen(false); setForm({ ...EMPTY }); await load()
    } finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editStudent) return; setSaving(true)
    try {
      await studentsApi.update(editStudent.id, { ...form, unit_id: form.unit_id || undefined })
      setEditStudent(null); await load()
    } finally { setSaving(false) }
  }

  async function handleDelete(s: Student) {
    if (!confirm(`Desativar aluno "${s.full_name}"?`)) return
    await studentsApi.update(s.id, { status: "inactive" }); await load()
  }

  const F = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const FormFields = () => (
    <div className="space-y-4 mt-2">
      <div className="space-y-1.5"><Label>Nome completo</Label><Input value={form.full_name} onChange={e => F("full_name", e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => F("email", e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.phone} onChange={e => F("phone", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Gênero</Label>
          <Select value={form.gender} onValueChange={v => F("gender", v)}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Masculino</SelectItem>
              <SelectItem value="F">Feminino</SelectItem>
              <SelectItem value="O">Outro</SelectItem>
            </SelectContent>
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
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Alunos</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Novo aluno</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo aluno</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate}><FormFields />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Criar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editStudent} onOpenChange={o => !o && setEditStudent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar aluno</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}><FormFields />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditStudent(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex gap-4 mb-4">
        <Select value={filterUnit} onValueChange={setFilterUnit}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Filtrar por unidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as unidades</SelectItem>
            {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Carregando…</p> : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Status</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
            <TableBody>
              {students.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.full_name ?? "—"}</TableCell>
                  <TableCell>{s.email ?? "—"}</TableCell>
                  <TableCell>{s.phone ?? "—"}</TableCell>
                  <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status === "active" ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell><div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(s)}><Trash2 className="size-4" /></Button>
                  </div></TableCell>
                </TableRow>
              ))}
              {students.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum aluno encontrado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
