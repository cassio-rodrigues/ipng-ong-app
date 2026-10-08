"use client"

import { useEffect, useState } from "react"
import { booksApi, loansApi } from "@/lib/api"
import { availableCopies } from "@/lib/books"
import type { Book, Student } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY = { student_id: "", book_id: "", due_date: "", notes: "" }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  /** Lista para escolher o aluno (tela Biblioteca) */
  students?: Student[]
  /** Aluno já definido (perfil do aluno) — esconde a escolha */
  student?: { id: string; full_name: string | null }
}

export function NewLoanDialog({ open, onOpenChange, onCreated, students = [], student }: Props) {
  const [books, setBooks] = useState<Book[]>([])
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  // Recarrega os livros a cada abertura para a disponibilidade estar em dia
  useEffect(() => {
    if (open) booksApi.list().then(r => setBooks(r.data)).catch(() => {})
  }, [open])

  function handleOpenChange(o: boolean) {
    if (!o) setForm({ ...EMPTY })
    onOpenChange(o)
  }

  const studentId = student?.id ?? form.student_id

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId || !form.book_id) return
    setSaving(true)
    try {
      await loansApi.create({
        student_id: studentId,
        book_id: form.book_id,
        due_date: form.due_date ? `${form.due_date}T23:59:00` : undefined,
        notes: form.notes || undefined,
      })
      toast.success("Empréstimo registrado")
      handleOpenChange(false)
      onCreated()
    } catch {
      // A mensagem do servidor (ex.: sem exemplares) já é exibida pelo interceptor da API
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar empréstimo{student?.full_name ? ` — ${student.full_name}` : ""}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {!student && (
            <div className="space-y-1.5">
              <Label>Aluno</Label>
              <Combobox
                options={students.map(s => ({ value: s.id, label: s.full_name ?? s.id }))}
                value={form.student_id}
                onValueChange={v => setForm(f => ({ ...f, student_id: v }))}
                placeholder="Buscar aluno pelo nome…"
                emptyText="Nenhum aluno encontrado"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Livro</Label>
            <Select value={form.book_id} onValueChange={v => setForm(f => ({ ...f, book_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecionar livro" /></SelectTrigger>
              <SelectContent>
                {books.filter(b => b.active !== false).map(b => {
                  const free = availableCopies(b)
                  return (
                    <SelectItem key={b.id} value={b.id} disabled={free === 0}>
                      {b.title ?? b.id}{b.author ? ` — ${b.author}` : ""}
                      {free !== null && <span className="text-muted-foreground"> · {free === 0 ? "sem exemplares" : `${free} disponível(is)`}</span>}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Data de devolução prevista</Label>
            <Input type="date" min={today()} value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Condição do livro, observações…" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !studentId || !form.book_id}>{saving ? "Salvando…" : "Registrar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
