"use client"

import { useEffect, useRef, useState } from "react"
import { lessonsApi, classesApi } from "@/lib/api"
import type { Lesson, Class_ } from "@/types"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExternalLink, Pencil, Plus, Trash2, Download, Upload, FileSpreadsheet } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { exportToExcel, downloadTemplate, parseExcel, fmtDateTime } from "@/lib/excel"
import { toast } from "sonner"

const LESSON_HEADERS = ["Turma (nome)", "Data e hora (DD/MM/AAAA HH:MM)", "Status (scheduled/completed/cancelled)"]
const STATUS_LABEL: Record<string, string> = { scheduled: "Agendada", completed: "Concluída", cancelled: "Cancelada" }
const today = () => new Date().toISOString().slice(0, 10)
const getEmpty = () => ({ class_id: "", scheduled_at: `${today()}T00:00` })

export default function LessonsPage() {
  const { canEdit, isTeacher, user } = useAuth()
  const canManage = canEdit || isTeacher
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [classes, setClasses] = useState<Class_[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editLesson, setEditLesson] = useState<Lesson | null>(null)
  const [filterClass, setFilterClass] = useState("all")
  const [form, setForm] = useState(getEmpty())
  const [editStatus, setEditStatus] = useState("")
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const classParams = isTeacher && user?.id ? { teacher_id: user.id } : {}
      const [lRes, cRes] = await Promise.all([
        lessonsApi.list(filterClass !== "all" ? { class_id: filterClass } : {}),
        classesApi.list(classParams),
      ])
      setLessons(lRes.data); setClasses(cRes.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterClass])

  function openEdit(l: Lesson) {
    setEditLesson(l)
    setForm({ class_id: l.class_id ?? "", scheduled_at: l.scheduled_at ? l.scheduled_at.slice(0, 16) : "" })
    setEditStatus(l.status ?? "scheduled")
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try { await lessonsApi.create(form); setCreateOpen(false); setForm(getEmpty()); await load() }
    finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editLesson) return; setSaving(true)
    try {
      await lessonsApi.update(editLesson.id, { class_id: form.class_id || undefined, scheduled_at: form.scheduled_at || undefined, status: editStatus })
      setEditLesson(null); await load()
    } finally { setSaving(false) }
  }

  async function handleDelete(l: Lesson) {
    if (!confirm("Cancelar esta aula?")) return
    await lessonsApi.update(l.id, { status: "cancelled" }); await load()
  }

  const F = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]))
  const classNameMap = Object.fromEntries(classes.map(c => [(c.name ?? "").toLowerCase(), c.id]))

  function handleExport() {
    exportToExcel(lessons.map(l => ({
      "Turma (nome)": l.class_id ? classMap[l.class_id] ?? "" : "",
      "Data e hora (DD/MM/AAAA HH:MM)": l.scheduled_at ? new Date(l.scheduled_at).toLocaleString("pt-BR") : "",
      "Status (scheduled/completed/cancelled)": l.status ?? "",
    })), "aulas")
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const rows = await parseExcel(file)
    let ok = 0, fail = 0
    for (const row of rows) {
      const class_id = classNameMap[String(row["Turma (nome)"] ?? "").toLowerCase()]
      if (!class_id) { fail++; continue }
      try {
        await lessonsApi.create({
          class_id,
          scheduled_at: fmtDateTime(row["Data e hora (DD/MM/AAAA HH:MM)"]),
          status: row["Status (scheduled/completed/cancelled)"] || "scheduled",
        })
        ok++
      } catch { fail++ }
    }
    toast.success(`${ok} importado(s)${fail > 0 ? `, ${fail} com erro` : ""}`)
    await load()
    e.target.value = ""
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Aulas</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-4 mr-2" />Exportar</Button>
          {canManage && <>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(LESSON_HEADERS, "aulas")}><FileSpreadsheet className="size-4 mr-2" />Modelo</Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="size-4 mr-2" />Importar</Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </>}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            {canManage && <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Agendar aula</Button></DialogTrigger>}
            <DialogContent>
              <DialogHeader><DialogTitle>Agendar aula</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label>Turma</Label>
                    <Select value={form.class_id} onValueChange={v => F("class_id", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecionar turma" /></SelectTrigger>
                      <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Data e hora</Label><Input type="datetime-local" value={form.scheduled_at} onChange={e => F("scheduled_at", e.target.value)} required /></div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={saving || !form.class_id}>{saving ? "Salvando…" : "Agendar"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={!!editLesson} onOpenChange={o => !o && setEditLesson(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar aula</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Turma</Label>
                <Select value={form.class_id} onValueChange={v => F("class_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Data e hora</Label><Input type="datetime-local" value={form.scheduled_at} onChange={e => F("scheduled_at", e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendada</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditLesson(null)}>Cancelar</Button>
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
            <TableHeader><TableRow><TableHead>Turma</TableHead><TableHead>Data agendada</TableHead><TableHead>Status</TableHead><TableHead>Relatório</TableHead><TableHead className="w-28" /></TableRow></TableHeader>
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
                  <TableCell>{l.report ? <Badge variant="outline">Preenchido</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                  <TableCell><div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Ver detalhes" asChild>
                      <Link href={`/lessons/${l.id}`}><ExternalLink className="size-4" /></Link>
                    </Button>
                    {canManage && <><Button variant="ghost" size="icon" onClick={() => openEdit(l)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(l)}><Trash2 className="size-4" /></Button></>}
                  </div></TableCell>
                </TableRow>
              ))}
              {lessons.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma aula encontrada</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
