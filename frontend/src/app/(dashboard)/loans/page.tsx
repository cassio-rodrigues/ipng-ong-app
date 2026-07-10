"use client"

import { useEffect, useState } from "react"
import { loansApi, studentsApi, booksApi } from "@/lib/api"
import type { BookLoan, Student, Book } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BookOpen, Plus, RotateCcw, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

const STATUS_LABEL: Record<string, string> = {
  active: "Emprestado",
  returned: "Devolvido",
  overdue: "Atrasado",
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  returned: "secondary",
  overdue: "destructive",
}

function computedStatus(loan: BookLoan): string {
  if (loan.status === "returned") return "returned"
  if (loan.due_date && new Date(loan.due_date) < new Date()) return "overdue"
  return "active"
}

const today = () => new Date().toISOString().slice(0, 10)

export default function LoansPage() {
  const { canEdit } = useAuth()
  const [loans, setLoans] = useState<BookLoan[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [returning, setReturning] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [form, setForm] = useState({ student_id: "", book_id: "", due_date: "", notes: "" })
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const [lRes, sRes, bRes] = await Promise.all([
        loansApi.list(filterStatus !== "all" ? { status: filterStatus } : {}),
        studentsApi.list({}),
        booksApi.list(),
      ])
      setLoans(lRes.data)
      setStudents(sRes.data)
      setBooks(bRes.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterStatus])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.student_id || !form.book_id) return
    setSaving(true)
    try {
      await loansApi.create({
        student_id: form.student_id,
        book_id: form.book_id,
        due_date: form.due_date ? `${form.due_date}T23:59:00` : undefined,
        notes: form.notes || undefined,
      })
      toast.success("Empréstimo registrado")
      setCreateOpen(false)
      setForm({ student_id: "", book_id: "", due_date: "", notes: "" })
      await load()
    } catch {
      toast.error("Erro ao registrar empréstimo")
    } finally { setSaving(false) }
  }

  async function handleReturn(loan: BookLoan) {
    setReturning(loan.id)
    try {
      await loansApi.return(loan.id)
      toast.success(`"${loan.book?.title}" devolvido com sucesso`)
      await load()
    } catch {
      toast.error("Erro ao registrar devolução")
    } finally { setReturning(null) }
  }

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—"
  const studentName = (id: string) => students.find(s => s.id === id)?.full_name ?? "—"
  const bookTitle = (id: string) => books.find(b => b.id === id)?.title ?? "—"

  const activeCount = loans.filter(l => computedStatus(l) === "active").length
  const overdueCount = loans.filter(l => computedStatus(l) === "overdue").length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Biblioteca</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeCount} emprestado(s)
            {overdueCount > 0 && (
              <span className="text-destructive ml-2 font-medium">· {overdueCount} atrasado(s)</span>
            )}
          </p>
        </div>
        {canEdit && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="size-4 mr-2" />Novo empréstimo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar empréstimo</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Aluno</Label>
                  <Select value={form.student_id} onValueChange={v => setForm(f => ({ ...f, student_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar aluno" /></SelectTrigger>
                    <SelectContent>
                      {students.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name ?? s.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Livro</Label>
                  <Select value={form.book_id} onValueChange={v => setForm(f => ({ ...f, book_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar livro" /></SelectTrigger>
                    <SelectContent>
                      {books.filter(b => b.active !== false).map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.title ?? b.id}{b.author ? ` — ${b.author}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Data de devolução prevista</Label>
                  <Input
                    type="date"
                    min={today()}
                    value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Observações</Label>
                  <Input
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Condição do livro, observações…"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={saving || !form.student_id || !form.book_id}>
                    {saving ? "Salvando…" : "Registrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Emprestados</SelectItem>
            <SelectItem value="returned">Devolvidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : (
        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Livro</TableHead>
                <TableHead>Emprestado em</TableHead>
                <TableHead>Devolução prevista</TableHead>
                <TableHead>Devolvido em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map(loan => {
                const status = computedStatus(loan)
                const isOverdue = status === "overdue"
                return (
                  <TableRow key={loan.id} className={isOverdue ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">
                      {loan.student?.full_name ?? studentName(loan.student_id)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="size-3.5 text-muted-foreground shrink-0" />
                        {loan.book?.title ?? bookTitle(loan.book_id)}
                        {loan.book?.author && (
                          <span className="text-xs text-muted-foreground">— {loan.book.author}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{fmt(loan.borrowed_at)}</TableCell>
                    <TableCell>
                      <span className={isOverdue ? "text-destructive font-medium" : ""}>
                        {loan.due_date ? (
                          <span className="flex items-center gap-1">
                            {fmt(loan.due_date)}
                            {isOverdue && <AlertCircle className="size-3.5 text-destructive" />}
                          </span>
                        ) : "—"}
                      </span>
                    </TableCell>
                    <TableCell>{fmt(loan.returned_at)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[status] ?? "outline"}>
                        {STATUS_LABEL[status] ?? status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {status !== "returned" && canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={returning === loan.id}
                          onClick={() => handleReturn(loan)}
                        >
                          <RotateCcw className="size-3.5" />
                          {returning === loan.id ? "…" : "Devolver"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {loans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Nenhum empréstimo encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
