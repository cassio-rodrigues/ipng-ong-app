"use client"

import { useEffect, useState } from "react"
import { usersApi } from "@/lib/api"
import type { User } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2 } from "lucide-react"

const ROLE_LABEL: Record<string, string> = { admin: "Admin", coordinator: "Coordenador", teacher: "Professor" }
const EMPTY = { name: "", email: "", password: "", role: "teacher", telefone: "", gender: "", birth_date: "" }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  async function load() {
    try { const { data } = await usersApi.list({ limit: 100 }); setUsers(data) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openEdit(u: User) {
    setEditUser(u)
    setForm({ name: u.name ?? "", email: u.email ?? "", password: "", role: u.role ?? "teacher", telefone: u.telefone ?? "", gender: u.gender ?? "", birth_date: u.birth_date ? u.birth_date.slice(0, 10) : "" })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await usersApi.create({ ...form, birth_date: form.birth_date || undefined, gender: form.gender || undefined })
      setCreateOpen(false); setForm({ ...EMPTY }); await load()
    } finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editUser) return; setSaving(true)
    try {
      const payload: Record<string, unknown> = { name: form.name, email: form.email, role: form.role, telefone: form.telefone, gender: form.gender || undefined, birth_date: form.birth_date || undefined }
      if (form.password) payload.password = form.password
      await usersApi.update(editUser.id, payload)
      setEditUser(null); await load()
    } finally { setSaving(false) }
  }

  async function handleDelete(u: User) {
    if (!confirm(`Excluir "${u.name}"? Esta ação desativa o usuário.`)) return
    await usersApi.deactivate(u.id); await load()
  }

  const F = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const formFields = (isEdit?: boolean) => (
    <div className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Nome</Label><Input value={form.name} onChange={e => F("name", e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.telefone} onChange={e => F("telefone", e.target.value)} /></div>
      </div>
      <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => F("email", e.target.value)} required /></div>
      <div className="space-y-1.5">
        <Label>{isEdit ? "Nova senha (deixe vazio para manter)" : "Senha"}</Label>
        <Input type="password" value={form.password} onChange={e => F("password", e.target.value)} required={!isEdit} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Data de nascimento</Label>
          <Input type="date" value={form.birth_date} onChange={e => F("birth_date", e.target.value)} />
        </div>
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
        <Label>Perfil</Label>
        <Select value={form.role} onValueChange={v => F("role", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="coordinator">Coordenador</SelectItem>
            <SelectItem value="teacher">Professor</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Novo usuário</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
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

      <Dialog open={!!editUser} onOpenChange={o => !o && setEditUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}>
            {formFields(true)}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? <p className="text-muted-foreground text-sm">Carregando…</p> : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Perfil</TableHead><TableHead>Status</TableHead><TableHead className="w-20" /></TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                  <TableCell>{u.email ?? "—"}</TableCell>
                  <TableCell>{u.telefone ?? "—"}</TableCell>
                  <TableCell>{u.role ? ROLE_LABEL[u.role] ?? u.role : "—"}</TableCell>
                  <TableCell><Badge variant={u.status === "active" ? "default" : "secondary"}>{u.status === "active" ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell><div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(u)}><Trash2 className="size-4" /></Button>
                  </div></TableCell>
                </TableRow>
              ))}
              {users.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
