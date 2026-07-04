"use client"

import { useEffect, useRef, useState } from "react"
import { studentsApi, unitsApi, classesApi } from "@/lib/api"
import type { Student, Unit, Class_, Enrollment } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2, BookOpen, Download, Upload, FileSpreadsheet, ExternalLink, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { exportToExcel, downloadTemplate, parseExcel, fmtDate } from "@/lib/excel"
import { toast } from "sonner"

const EMPTY = { full_name: "", email: "", phone: "", gender: "", birth_date: "", unit_id: "" }

const STUDENT_HEADERS = ["Nome completo", "Email", "Telefone", "Nascimento (DD/MM/AAAA)", "Gênero (M/F/O)", "Unidade"]

export default function StudentsPage() {
  const { canEdit, isTeacher } = useAuth()
  const canManage = canEdit || isTeacher
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [classes, setClasses] = useState<Class_[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [enrollStudent, setEnrollStudent] = useState<Student | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [enrollClassId, setEnrollClassId] = useState("")
  const [filterUnit, setFilterUnit] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const params: Record<string, string> = {}
      if (filterUnit !== "all") params.unit_id = filterUnit
      if (filterStatus !== "all") params.status = filterStatus
      const [sRes, uRes, cRes] = await Promise.all([
        studentsApi.list(params),
        unitsApi.list(),
        classesApi.list(),
      ])
      setStudents(sRes.data); setUnits(uRes.data); setClasses(cRes.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterUnit, filterStatus])

  function openEdit(s: Student) {
    setEditStudent(s)
    setForm({ full_name: s.full_name ?? "", email: s.email ?? "", phone: s.phone ?? "", gender: s.gender ?? "", birth_date: s.birth_date ? s.birth_date.slice(0, 10) : "", unit_id: s.unit_id ?? "" })
  }

  async function openEnroll(s: Student) {
    setEnrollStudent(s); setEnrollClassId("")
    const { data } = await studentsApi.getEnrollments(s.id)
    setEnrollments(data)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await studentsApi.create({ ...form, unit_id: form.unit_id || undefined, gender: form.gender || undefined, birth_date: form.birth_date || undefined })
      setCreateOpen(false); setForm({ ...EMPTY }); await load()
    } finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editStudent) return; setSaving(true)
    try {
      await studentsApi.update(editStudent.id, { ...form, unit_id: form.unit_id || undefined, gender: form.gender || undefined, birth_date: form.birth_date || undefined })
      setEditStudent(null); await load()
    } finally { setSaving(false) }
  }

  async function handleDeactivate(s: Student) {
    if (!confirm(`Desativar aluno "${s.full_name}"?`)) return
    await studentsApi.update(s.id, { status: "inactive" }); await load()
  }

  async function handleReactivate(s: Student) {
    if (!confirm(`Reativar aluno "${s.full_name}"?`)) return
    await studentsApi.update(s.id, { status: "active" }); await load()
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault(); if (!enrollStudent || !enrollClassId) return; setSaving(true)
    try {
      await studentsApi.enroll(enrollStudent.id, enrollClassId)
      const { data } = await studentsApi.getEnrollments(enrollStudent.id)
      setEnrollments(data); setEnrollClassId("")
    } finally { setSaving(false) }
  }

  const F = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]))
  const unitNameMap = Object.fromEntries(units.map(u => [u.name?.toLowerCase() ?? "", u.id]))

  function handleExport() {
    exportToExcel(students.map(s => ({
      "Nome completo": s.full_name ?? "",
      "Email": s.email ?? "",
      "Telefone": s.phone ?? "",
      "Nascimento (DD/MM/AAAA)": s.birth_date ? new Date(s.birth_date).toLocaleDateString("pt-BR") : "",
      "Gênero (M/F/O)": s.gender ?? "",
      "Unidade": units.find(u => u.id === s.unit_id)?.name ?? "",
    })), "alunos")
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const rows = await parseExcel(file)
    let ok = 0, fail = 0
    for (const row of rows) {
      const name = String(row["Nome completo"] ?? "").trim()
      if (!name) continue
      try {
        await studentsApi.create({
          full_name: name,
          email: row["Email"] || undefined,
          phone: row["Telefone"] || undefined,
          birth_date: fmtDate(row["Nascimento (DD/MM/AAAA)"]),
          gender: row["Gênero (M/F/O)"] || undefined,
          unit_id: unitNameMap[String(row["Unidade"] ?? "").toLowerCase()] || undefined,
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
      <div className="space-y-1.5"><Label>Nome completo</Label><Input value={form.full_name} onChange={e => F("full_name", e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => F("email", e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.phone} onChange={e => F("phone", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Data de nascimento</Label><Input type="date" value={form.birth_date} onChange={e => F("birth_date", e.target.value)} /></div>
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
      </div>
      <div className="space-y-1.5">
        <Label>Unidade</Label>
        <Select value={form.unit_id} onValueChange={v => F("unit_id", v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
          <SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Alunos</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-4 mr-2" />Exportar</Button>
          {canManage && <>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(STUDENT_HEADERS, "alunos")}><FileSpreadsheet className="size-4 mr-2" />Modelo</Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="size-4 mr-2" />Importar</Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </>}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            {canManage && <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Novo aluno</Button></DialogTrigger>}
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo aluno</DialogTitle></DialogHeader>
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

      <Dialog open={!!editStudent} onOpenChange={o => !o && setEditStudent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar aluno</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}>
            {formFields()}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditStudent(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!enrollStudent} onOpenChange={o => !o && setEnrollStudent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Matrículas — {enrollStudent?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            {canManage && <form onSubmit={handleEnroll} className="flex gap-2">
              <Select value={enrollClassId} onValueChange={setEnrollClassId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar turma" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <Button type="submit" disabled={saving || !enrollClassId} size="sm">Matricular</Button>
            </form>}
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Turma</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                <TableBody>
                  {enrollments.map(en => (
                    <TableRow key={en.id}>
                      <TableCell>{classMap[en.class_id] ?? "—"}</TableCell>
                      <TableCell><Badge variant={en.status === "active" ? "default" : "secondary"}>{en.status ?? "—"}</Badge></TableCell>
                      <TableCell>{en.enrollment_date ? new Date(en.enrollment_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {enrollments.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sem matrículas</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterUnit} onValueChange={setFilterUnit}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Filtrar por unidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as unidades</SelectItem>
            {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Carregando…</p> : (
        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Nascimento</TableHead><TableHead>Status</TableHead><TableHead className="w-28" /></TableRow></TableHeader>
            <TableBody>
              {students.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.full_name ?? "—"}</TableCell>
                  <TableCell>{s.email ?? "—"}</TableCell>
                  <TableCell>{s.phone ?? "—"}</TableCell>
                  <TableCell>{s.birth_date ? new Date(s.birth_date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status === "active" ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell><div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Ver histórico" asChild>
                      <Link href={`/students/${s.id}`}><ExternalLink className="size-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" title="Matrículas" onClick={() => openEnroll(s)}><BookOpen className="size-4" /></Button>
                    {canManage && <>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="size-4" /></Button>
                      {s.status === "inactive"
                        ? <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" title="Reativar" onClick={() => handleReactivate(s)}><RotateCcw className="size-4" /></Button>
                        : <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Desativar" onClick={() => handleDeactivate(s)}><Trash2 className="size-4" /></Button>
                      }
                    </>}
                  </div></TableCell>
                </TableRow>
              ))}
              {students.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum aluno encontrado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
