"use client"

import { useEffect, useState } from "react"
import { booksApi } from "@/lib/api"
import type { Book } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
const EMPTY = { title: "", author: "", level: "", isbn: "", description: "" }

export default function BooksPage() {
  const { canEdit } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editBook, setEditBook] = useState<Book | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  async function load() {
    try { const { data } = await booksApi.list(); setBooks(data) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openEdit(b: Book) {
    setEditBook(b)
    setForm({ title: b.title ?? "", author: b.author ?? "", level: b.level ?? "", isbn: b.isbn ?? "", description: b.description ?? "" })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try { await booksApi.create({ ...form, level: form.level || undefined }); setCreateOpen(false); setForm({ ...EMPTY }); await load() }
    finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editBook) return; setSaving(true)
    try { await booksApi.update(editBook.id, { ...form, level: form.level || undefined }); setEditBook(null); await load() }
    finally { setSaving(false) }
  }

  async function handleDelete(b: Book) {
    if (!confirm(`Desativar livro "${b.title}"?`)) return
    await booksApi.update(b.id, { active: false }); await load()
  }

  const F = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const formFields = () => (
    <div className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>Título</Label>
        <Input value={form.title} onChange={e => F("title", e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Autor</Label><Input value={form.author} onChange={e => F("author", e.target.value)} /></div>
        <div className="space-y-1.5"><Label>ISBN</Label><Input value={form.isbn} onChange={e => F("isbn", e.target.value)} /></div>
      </div>
      <div className="space-y-1.5">
        <Label>Nível</Label>
        <Select value={form.level} onValueChange={v => F("level", v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
          <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Descrição</Label><Input value={form.description} onChange={e => F("description", e.target.value)} /></div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Livros</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          {canEdit && <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-2" />Novo livro</Button></DialogTrigger>}
          <DialogContent>
            <DialogHeader><DialogTitle>Novo livro</DialogTitle></DialogHeader>
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

      <Dialog open={!!editBook} onOpenChange={o => !o && setEditBook(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar livro</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit}>
            {formFields()}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditBook(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? <p className="text-muted-foreground text-sm">Carregando…</p> : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead><TableHead>Autor</TableHead><TableHead>Nível</TableHead><TableHead>ISBN</TableHead><TableHead>Capítulos</TableHead><TableHead>Status</TableHead><TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.title ?? "—"}</TableCell>
                  <TableCell>{b.author ?? "—"}</TableCell>
                  <TableCell>{b.level ? <Badge variant="outline">{b.level}</Badge> : "—"}</TableCell>
                  <TableCell>{b.isbn ?? "—"}</TableCell>
                  <TableCell>{b.chapters?.length ?? 0}</TableCell>
                  <TableCell><Badge variant={b.active ? "default" : "secondary"}>{b.active ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell>
                    {canEdit && <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(b)}><Trash2 className="size-4" /></Button>
                    </div>}
                  </TableCell>
                </TableRow>
              ))}
              {books.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum livro cadastrado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
