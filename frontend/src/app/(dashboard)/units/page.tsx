"use client"

import { useEffect, useState } from "react"
import { unitsApi } from "@/lib/api"
import type { Unit } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2 } from "lucide-react"

const EMPTY = { name: "", address: "" }

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUnit, setEditUnit] = useState<Unit | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  async function load() {
    try { const { data } = await unitsApi.list(); setUnits(data) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openEdit(u: Unit) {
    setEditUnit(u); setForm({ name: u.name ?? "", address: u.address ?? "" })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try { await unitsApi.create(form); setCreateOpen(false); setForm({ ...EMPTY }); await load() }
    finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editUnit) return; setSaving(true)
    try { await unitsApi.update(editUnit.id, form); setEditUnit(null); await load() }
    finally { setSaving(false) }
  }

  async function handleDelete(u: Unit) {
    if (!confirm(`Desativar unidade "${u.name}"?`)) return
    await unitsApi.update(u.id, { status: "inactive" }); await load()
  }

  const F = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const FormFields = () => (
    <div className="space-y-4 mt-2">
      <div className="space-y-1.5"><Label>Nome</Label><Input value={form.name} onChange={e => F("name", e.target.value)} required /></div>
      <div className="space-y-1.5"><Label>Endereço</Label><Input value={form.address} onChange={e => F("address", e.target.value)} /></div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Unidades</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Nova unidade</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova unidade</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate}><FormFields />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Criar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editUnit} onOpenChange={o => !o && setEditUnit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar unidade</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}><FormFields />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditUnit(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? <p className="text-muted-foreground text-sm">Carregando…</p> : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Endereço</TableHead><TableHead>Status</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
            <TableBody>
              {units.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                  <TableCell>{u.address ?? "—"}</TableCell>
                  <TableCell><Badge variant={u.status === "active" ? "default" : "secondary"}>{u.status === "active" ? "Ativa" : "Inativa"}</Badge></TableCell>
                  <TableCell><div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(u)}><Trash2 className="size-4" /></Button>
                  </div></TableCell>
                </TableRow>
              ))}
              {units.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma unidade cadastrada</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
