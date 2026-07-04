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
import { Pencil, Plus, Trash2, Download, Upload, FileSpreadsheet } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { exportToExcel, downloadTemplate, parseExcel, fmtDate } from "@/lib/excel"
import { toast } from "sonner"

const CLASS_HEADERS = ["Nome", "Nível (A1/A2/B1/B2/C1/C2)", "Unidade", "Professor (email)", "Livro", "Início (DD/MM/AAAA)", "Fim (DD/MM/AAAA)"]

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
const EMPTY = { name: "", level: "", unit_id: "", main_teacher_id: "", book_id: "", start_date: "", end_date: "" }

export default function ClassesPage() {
  const { canEdit } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
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
    setForm({ name: c.name ?? "", level: c.level ?? "", unit_id: c.unit_id ?? "", main_teacher_id: c.main_teacher_id ?? "", book_id: c.book_id ?? "", start_date: c.start_date ? c.start_date.slice(0, 10) : "", end_date: c.end_date ? c.end_date.slice(0, 10) : "" })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await classesApi.create({ name: form.name, level: form.level || undefined, unit_id: form.unit_id || undefined, main_teacher_id: form.main_teacher_id || undefined, book_id: form.book_id || undefined, start_date: form.start_date || undefined, end_date: form.end_date || undefined })
      setCreateOpen(false); setForm({ ...EMPTY }); await load()
    } finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editClass) return; setSaving(true)
    try {
      await classesApi.update(editClass.id, { name: form.name, level: form.level || undefined, unit_id: form.unit_id || undefined, main_teacher_id: form.main_teacher_id || undefined, book_id: form.book_id || undefined, start_date: form.start_date || undefined, end_date: form.end_date || undefined })
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
  const unitNameMap = Object.fromEntries(units.map(u => [u.name.toLowerCase(), u.id]))
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
    })), "turmas")
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const rows = await parseExcel(file)
    let ok = 0, fail = 0
    for (const row of rows) {
      const name = String(row["Nome"] ?? "").trim()
      if (!name) continue
      try {
        await classesApi.create({
          name,
          level: row["Nível (A1/A2/B1/B2/C1/C2)"] || undefined,
          unit_id: unitNameMap[String(row["Unidade"] ?? "").toLowerCase()] || undefined,
          main_teacher_id: teacherEmailMap[String(row["Professor (email)"] ?? "").toLowerCase()] || undefined,
          book_id: bookTitleMap[String(row["Livro"] ?? "").toLowerCase()] || undefined,
          start_date: fmtDate(row["Início (DD/MM/AAAA)"]),
          end_date: fmtDate(row["Fim (DD/MM/AAAA)"]),
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
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Turmas</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-4 mr-2" />Exportar</Button>
          {canEdit && <>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(CLASS_HEADERS, "turmas")}><FileSpreadsheet className="size-4 mr-2" />Modelo</Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="size-4 mr-2" />Importar</Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </>}
          {canEdit && <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Nova turma</Button></DialogTrigger>}
        </div>
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

      <Dialog open={!!editClass} onOpenChange={o => !o && setEditClass(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar turma</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}>
            {formFields()}
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
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Nível</TableHead><TableHead>Unidade</TableHead><TableHead>Professor</TableHead><TableHead>Período</TableHead><TableHead>Status</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
            <TableBody>
              {classes.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name ?? "—"}</TableCell>
                  <TableCell>{c.level ? <Badge variant="outline">{c.level}</Badge> : "—"}</TableCell>
                  <TableCell>{c.unit_id ? unitMap[c.unit_id] ?? "—" : "—"}</TableCell>
                  <TableCell>{c.main_teacher_id ? teacherMap[c.main_teacher_id] ?? "—" : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.start_date ? new Date(c.start_date).toLocaleDateString("pt-BR") : "—"}
                    {c.end_date ? ` – ${new Date(c.end_date).toLocaleDateString("pt-BR")}` : ""}
                  </TableCell>
                  <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status === "active" ? "Ativa" : "Inativa"}</Badge></TableCell>
                  <TableCell>{canEdit && <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(c)}><Trash2 className="size-4" /></Button>
                  </div>}</TableCell>
                </TableRow>
              ))}
              {classes.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma turma cadastrada</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
