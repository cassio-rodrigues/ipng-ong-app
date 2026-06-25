"use client"

import { useEffect, useState } from "react"
import { calendarApi, unitsApi } from "@/lib/api"
import type { CalendarEvent, Unit } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2 } from "lucide-react"

const EVENT_TYPES: Record<string, string> = { holiday: "Feriado", institutional: "Institucional", class_event: "Evento de turma" }
const VISIBILITY_LABEL: Record<string, string> = { all: "Todos", teachers: "Professores", coordinators: "Coordenadores" }
const EMPTY = { title: "", event_type: "institutional", start_date: "", end_date: "", description: "", visibility: "all", unit_id: "", is_all_day: "false" }

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const [eRes, uRes] = await Promise.all([calendarApi.list(), unitsApi.list()])
      setEvents(eRes.data); setUnits(uRes.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openEdit(ev: CalendarEvent) {
    setEditEvent(ev)
    setForm({ title: ev.title ?? "", event_type: ev.event_type ?? "institutional", start_date: ev.start_date ? ev.start_date.slice(0, 16) : "", end_date: ev.end_date ? ev.end_date.slice(0, 16) : "", description: ev.description ?? "", visibility: ev.visibility ?? "all", unit_id: ev.unit_id ?? "", is_all_day: String(ev.is_all_day ?? false) })
  }

  const toPayload = () => ({ ...form, unit_id: form.unit_id || undefined, is_all_day: form.is_all_day === "true" })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try { await calendarApi.create(toPayload()); setCreateOpen(false); setForm({ ...EMPTY }); await load() }
    finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editEvent) return; setSaving(true)
    try { await calendarApi.update(editEvent.id, toPayload()); setEditEvent(null); await load() }
    finally { setSaving(false) }
  }

  async function handleDelete(ev: CalendarEvent) {
    if (!confirm(`Remover "${ev.title}"?`)) return
    await calendarApi.delete(ev.id); await load()
  }

  const F = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const FormFields = () => (
    <div className="space-y-4 mt-2">
      <div className="space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={e => F("title", e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={form.event_type} onValueChange={v => F("event_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="holiday">Feriado</SelectItem>
              <SelectItem value="institutional">Institucional</SelectItem>
              <SelectItem value="class_event">Evento de turma</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Visibilidade</Label>
          <Select value={form.visibility} onValueChange={v => F("visibility", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="teachers">Professores</SelectItem>
              <SelectItem value="coordinators">Coordenadores</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Início</Label><Input type="datetime-local" value={form.start_date} onChange={e => F("start_date", e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Fim</Label><Input type="datetime-local" value={form.end_date} onChange={e => F("end_date", e.target.value)} /></div>
      </div>
      <div className="space-y-1.5">
        <Label>Unidade (opcional)</Label>
        <Select value={form.unit_id} onValueChange={v => F("unit_id", v)}>
          <SelectTrigger><SelectValue placeholder="Todas as unidades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas as unidades</SelectItem>
            {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Descrição</Label><Input value={form.description} onChange={e => F("description", e.target.value)} /></div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendário Institucional</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Novo evento</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo evento</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate}><FormFields />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Criar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editEvent} onOpenChange={o => !o && setEditEvent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar evento</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}><FormFields />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditEvent(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? <p className="text-muted-foreground text-sm">Carregando…</p> : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Tipo</TableHead><TableHead>Visibilidade</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
            <TableBody>
              {events.map(ev => (
                <TableRow key={ev.id}>
                  <TableCell className="font-medium">{ev.title ?? "—"}</TableCell>
                  <TableCell>{ev.event_type ? <Badge variant="outline">{EVENT_TYPES[ev.event_type] ?? ev.event_type}</Badge> : "—"}</TableCell>
                  <TableCell>{ev.visibility ? VISIBILITY_LABEL[ev.visibility] ?? ev.visibility : "—"}</TableCell>
                  <TableCell>{ev.start_date ? new Date(ev.start_date).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell>{ev.end_date ? new Date(ev.end_date).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell><div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(ev)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(ev)}><Trash2 className="size-4" /></Button>
                  </div></TableCell>
                </TableRow>
              ))}
              {events.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum evento cadastrado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
