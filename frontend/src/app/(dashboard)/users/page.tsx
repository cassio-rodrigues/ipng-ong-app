"use client"

import { useEffect, useRef, useState } from "react"
import { usersApi } from "@/lib/api"
import type { User } from "@/types"
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

const USER_HEADERS = ["Nome", "Email", "Senha", "Perfil (admin/coordinator/teacher)", "Telefone", "Nascimento (DD/MM/AAAA)", "Gênero (M/F/O)"]

const ROLE_LABEL: Record<string, string> = { admin: "Admin", coordinator: "Coordenador", teacher: "Professor" }
const EMPTY = { name: "", email: "", password: "", role: "teacher", telefone: "", gender: "", birth_date: "" }

export default function UsersPage() {
  const { canEdit } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  function handleExport() {
    exportToExcel(users.map(u => ({
      "Nome": u.name ?? "",
      "Email": u.email ?? "",
      "Perfil (admin/coordinator/teacher)": u.role ?? "",
      "Telefone": u.telefone ?? "",
      "Nascimento (DD/MM/AAAA)": u.birth_date ? new Date(u.birth_date).toLocaleDateString("pt-BR") : "",
      "Gênero (M/F/O)": u.gender ?? "",
    })), "usuarios")
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const rows = await parseExcel(file)
    let ok = 0, fail = 0
    for (const row of rows) {
      const name = String(row["Nome"] ?? "").trim()
      const email = String(row["Email"] ?? "").trim()
      const senha = String(row["Senha"] ?? "").trim()
      if (!name || !email || !senha) continue
      try {
        await usersApi.create({
          name,
          email,
          password: senha,
          role: String(row["Perfil (admin/coordinator/teacher)"] ?? "teacher"),
          telefone: row["Telefone"] || undefined,
          birth_date: fmtDate(row["Nascimento (DD/MM/AAAA)"]),
          gender: row["Gênero (M/F/O)"] || undefined,
        })
        ok++
      } catch { fail++ }
    }
    toast.success(`${ok} importado(s)${fail > 0 ? `, ${fail} com erro` : ""}`)
    await load()
    e.target.value = ""
  }

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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-4 mr-2" />Exportar</Button>
          {canEdit && <>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(USER_HEADERS, "usuarios")}><FileSpreadsheet className="size-4 mr-2" />Modelo</Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="size-4 mr-2" />Importar</Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </>}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          {canEdit && <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Novo usuário</Button></DialogTrigger>}
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
        <div className="rounded-md border bg-card overflow-x-auto">
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
                  <TableCell>{canEdit && <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(u)}><Trash2 className="size-4" /></Button>
                  </div>}</TableCell>
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
