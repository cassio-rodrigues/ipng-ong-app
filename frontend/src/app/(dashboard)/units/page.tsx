"use client"

import { useEffect, useRef, useState } from "react"
import { unitsApi, usersApi } from "@/lib/api"
import type { Unit, User } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2, Download, Upload, FileSpreadsheet } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { exportToExcel, downloadTemplate, parseExcel } from "@/lib/excel"
import { toast } from "sonner"

const UNIT_HEADERS = ["Nome", "Endereço", "Coordenador (email)"]
const EMPTY = { name: "", address: "", coordinator_id: "" }

export default function UnitsPage() {
  const { canEdit, user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [coordinators, setCoordinators] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUnit, setEditUnit] = useState<Unit | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const uRes = await unitsApi.list()
      setUnits(uRes.data)
      if (user?.role && user.role !== "teacher") {
        const usrRes = await usersApi.list({ limit: 200 })
        setCoordinators(usrRes.data.filter((u: User) => u.role === "coordinator" || u.role === "admin"))
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user?.role])

  function openEdit(u: Unit) {
    setEditUnit(u); setForm({ name: u.name ?? "", address: u.address ?? "", coordinator_id: u.coordinator_id ?? "" })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await unitsApi.create({ ...form, coordinator_id: form.coordinator_id || undefined })
      setCreateOpen(false); setForm({ ...EMPTY }); await load()
    } finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editUnit) return; setSaving(true)
    try {
      await unitsApi.update(editUnit.id, { ...form, coordinator_id: form.coordinator_id || undefined })
      setEditUnit(null); await load()
    } finally { setSaving(false) }
  }

  async function handleDelete(u: Unit) {
    if (!confirm(`Desativar unidade "${u.name}"?`)) return
    await unitsApi.update(u.id, { status: "inactive" }); await load()
  }

  const F = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))
  const coordMap = Object.fromEntries(coordinators.map(c => [c.id, c.name]))
  const coordEmailMap = Object.fromEntries(coordinators.map(c => [c.email?.toLowerCase() ?? "", c.id]))

  function handleExport() {
    exportToExcel(units.map(u => ({
      "Nome": u.name ?? "",
      "Endereço": u.address ?? "",
      "Coordenador (email)": u.coordinator_id ? coordinators.find(c => c.id === u.coordinator_id)?.email ?? "" : "",
    })), "unidades")
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
        await unitsApi.create({
          name,
          address: row["Endereço"] || undefined,
          coordinator_id: coordEmailMap[String(row["Coordenador (email)"] ?? "").toLowerCase()] || undefined,
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
      <div className="space-y-1.5"><Label>Nome</Label><Input value={form.name} onChange={e => F("name", e.target.value)} required /></div>
      <div className="space-y-1.5"><Label>Endereço</Label><Input value={form.address} onChange={e => F("address", e.target.value)} /></div>
      <div className="space-y-1.5">
        <Label>Coordenador responsável</Label>
        <Select value={form.coordinator_id} onValueChange={v => F("coordinator_id", v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
          <SelectContent>{coordinators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Unidades</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-4 mr-2" />Exportar</Button>
          {canEdit && <>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(UNIT_HEADERS, "unidades")}><FileSpreadsheet className="size-4 mr-2" />Modelo</Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="size-4 mr-2" />Importar</Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </>}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            {canEdit && <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Nova unidade</Button></DialogTrigger>}
            <DialogContent>
              <DialogHeader><DialogTitle>Nova unidade</DialogTitle></DialogHeader>
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

      <Dialog open={!!editUnit} onOpenChange={o => !o && setEditUnit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar unidade</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}>
            {formFields()}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditUnit(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? <p className="text-muted-foreground text-sm">Carregando…</p> : (
        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Endereço</TableHead><TableHead>Coordenador</TableHead><TableHead>Status</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
            <TableBody>
              {units.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                  <TableCell>{u.address ?? "—"}</TableCell>
                  <TableCell>{u.coordinator_id ? coordMap[u.coordinator_id] ?? "—" : "—"}</TableCell>
                  <TableCell><Badge variant={u.status === "active" ? "default" : "secondary"}>{u.status === "active" ? "Ativa" : "Inativa"}</Badge></TableCell>
                  <TableCell>{canEdit && <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(u)}><Trash2 className="size-4" /></Button>
                  </div>}</TableCell>
                </TableRow>
              ))}
              {units.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma unidade cadastrada</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
