"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { studentsApi } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  User,
  BookOpen,
  Star,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  BookMarked,
  TrendingUp,
} from "lucide-react"

interface StudentBasic {
  id: string; full_name: string | null; email: string | null; phone: string | null
  gender: string | null; birth_date: string | null; status: string | null
  created_at: string | null; unit_name: string | null
}
interface EnrollmentItem {
  id: string; class_id: string; status: string | null; enrollment_date: string | null
  class_: { id: string; name: string | null; level: string | null; status: string | null } | null
}
interface AttendanceItem {
  id: string; status: string | null; notes: string | null
  lesson: { id: string; scheduled_at: string | null; class_name: string | null } | null
}
interface AttendanceSummary {
  total: number; present: number; absent: number; late: number; justified: number; rate: number
  records: AttendanceItem[]
}
interface GradeItem {
  id: string; score: number | null; feedback: string | null; created_at: string | null
  assessment: { id: string; title: string | null; type: string | null; semester: string | null; date: string | null; max_score: number | null; class_name: string | null } | null
}
interface ActivityItem {
  id: string; status: string | null; score: number | null; notes: string | null
  activity: { id: string; title: string | null; type: string | null; date: string | null; class_name: string | null } | null
}
interface HighlightItem {
  id: string; title: string | null; description: string | null; highlight_type: string | null
  created_at: string | null; class_name: string | null; teacher_name: string | null
}
interface LoanItem {
  id: string; book_id: string; borrowed_at: string; due_date: string | null
  returned_at: string | null; status: string; notes: string | null
  book: { id: string; title: string | null; author: string | null } | null
}
interface History {
  student: StudentBasic
  enrollments: EnrollmentItem[]
  attendance: AttendanceSummary
  grades: GradeItem[]
  activities: ActivityItem[]
  highlights: HighlightItem[]
  loans: LoanItem[]
}

const GENDER: Record<string, string> = { M: "Masculino", F: "Feminino", O: "Outro" }
const ATT_ICON: Record<string, React.ReactNode> = {
  present: <CheckCircle2 className="size-3.5 text-green-500" />,
  absent: <XCircle className="size-3.5 text-red-500" />,
  late: <Clock className="size-3.5 text-yellow-500" />,
  justified: <FileText className="size-3.5 text-blue-500" />,
}
const ATT_LABEL: Record<string, string> = { present: "Presente", absent: "Ausente", late: "Atrasado", justified: "Justificado" }
const LOAN_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Emprestado", variant: "default" },
  returned: { label: "Devolvido", variant: "secondary" },
  overdue: { label: "Atrasado", variant: "destructive" },
}

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString("pt-BR") : "—"
}
function loanStatus(loan: LoanItem) {
  if (loan.status === "returned") return "returned"
  if (loan.due_date && new Date(loan.due_date) < new Date()) return "overdue"
  return "active"
}

function StatBadge({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

export default function StudentHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [history, setHistory] = useState<History | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentsApi.getHistory(id)
      .then(r => setHistory(r.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-muted-foreground text-sm p-6">Carregando…</p>
  if (!history) return <p className="text-sm text-destructive p-6">Aluno não encontrado.</p>

  const { student, enrollments, attendance, grades, activities, highlights, loans } = history

  const avgGrade = grades.length > 0
    ? (grades.reduce((s, g) => s + (g.score ?? 0), 0) / grades.length).toFixed(1)
    : null

  const activeLoans = loans.filter(l => loanStatus(l) !== "returned").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{student.full_name ?? "—"}</h1>
            <Badge variant={student.status === "active" ? "default" : "secondary"}>
              {student.status === "active" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {student.unit_name ?? "Sem unidade"} · Cadastrado em {fmt(student.created_at)}
          </p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="col-span-1">
          <CardContent className="pt-4 pb-4">
            <StatBadge value={`${attendance.rate}%`} label="Frequência" color={attendance.rate >= 75 ? "text-green-600" : "text-red-600"} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <StatBadge value={attendance.present} label="Presenças" color="text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <StatBadge value={attendance.absent} label="Faltas" color={attendance.absent > 0 ? "text-red-600" : "text-foreground"} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <StatBadge value={avgGrade ?? "—"} label="Média geral" color="text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <StatBadge value={highlights.length} label="Destaques" color="text-yellow-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <StatBadge value={activeLoans} label="Biblioteca" color={activeLoans > 0 ? "text-orange-600" : "text-foreground"} />
          </CardContent>
        </Card>
      </div>

      {/* Info + Turmas lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><User className="size-4" />Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Email", student.email],
              ["Telefone", student.phone],
              ["Gênero", student.gender ? GENDER[student.gender] ?? student.gender : null],
              ["Data de nascimento", student.birth_date ? fmt(student.birth_date) : null],
              ["Unidade", student.unit_name],
            ].map(([label, value]) => (
              <div key={label as string} className="flex gap-2">
                <span className="text-muted-foreground w-40 shrink-0">{label}</span>
                <span className="font-medium">{value ?? "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="size-4" />Turmas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 pb-6 pt-2">Sem matrículas</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turma</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.class_?.name ?? "—"}</TableCell>
                      <TableCell>{e.class_?.level ?? "—"}</TableCell>
                      <TableCell>{fmt(e.enrollment_date)}</TableCell>
                      <TableCell>
                        <Badge variant={e.status === "active" ? "default" : "secondary"} className="text-xs">
                          {e.status === "active" ? "Ativa" : e.status ?? "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="attendance">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="attendance">Presença ({attendance.total})</TabsTrigger>
          <TabsTrigger value="grades">Notas ({grades.length})</TabsTrigger>
          <TabsTrigger value="activities">Atividades ({activities.length})</TabsTrigger>
          <TabsTrigger value="highlights">Destaques ({highlights.length})</TabsTrigger>
          <TabsTrigger value="loans">Biblioteca ({loans.length})</TabsTrigger>
        </TabsList>

        {/* Presença */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="size-4 text-green-500" />
                  <span>{attendance.present} presentes</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <XCircle className="size-4 text-red-500" />
                  <span>{attendance.absent} faltas</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="size-4 text-yellow-500" />
                  <span>{attendance.late} atrasos</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <FileText className="size-4 text-blue-500" />
                  <span>{attendance.justified} justificados</span>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-sm font-medium">
                  <TrendingUp className="size-4" />
                  {attendance.rate}% de frequência
                </div>
              </div>
              {/* Barra de progresso */}
              {attendance.total > 0 && (
                <div className="flex h-2 rounded-full overflow-hidden mt-3 gap-px">
                  {attendance.present > 0 && <div className="bg-green-500" style={{ width: `${attendance.present / attendance.total * 100}%` }} />}
                  {attendance.late > 0 && <div className="bg-yellow-500" style={{ width: `${attendance.late / attendance.total * 100}%` }} />}
                  {attendance.justified > 0 && <div className="bg-blue-500" style={{ width: `${attendance.justified / attendance.total * 100}%` }} />}
                  {attendance.absent > 0 && <div className="bg-red-500" style={{ width: `${attendance.absent / attendance.total * 100}%` }} />}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.records.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>{a.lesson?.scheduled_at ? new Date(a.lesson.scheduled_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell>{a.lesson?.class_name ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {ATT_ICON[a.status ?? ""] ?? null}
                          <span className="text-xs">{ATT_LABEL[a.status ?? ""] ?? a.status ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.notes ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {attendance.records.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma aula registrada</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notas */}
        <TabsContent value="grades">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Semestre</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Feedback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map(g => {
                    const pct = g.assessment?.max_score && g.score != null
                      ? Math.round(Number(g.score) / g.assessment.max_score * 100)
                      : null
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{g.assessment?.title ?? "—"}</TableCell>
                        <TableCell>{g.assessment?.class_name ?? "—"}</TableCell>
                        <TableCell>{g.assessment?.type ?? "—"}</TableCell>
                        <TableCell>{g.assessment?.semester ?? "—"}</TableCell>
                        <TableCell>{fmt(g.assessment?.date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-semibold tabular-nums ${pct !== null && pct < 60 ? "text-red-600" : "text-foreground"}`}>
                              {g.score != null ? Number(g.score).toFixed(1) : "—"}
                            </span>
                            {g.assessment?.max_score && (
                              <span className="text-xs text-muted-foreground">/ {g.assessment.max_score}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{g.feedback ?? "—"}</TableCell>
                      </TableRow>
                    )
                  })}
                  {grades.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma nota registrada</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Atividades */}
        <TabsContent value="activities">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pontuação</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.activity?.title ?? "—"}</TableCell>
                      <TableCell>{a.activity?.class_name ?? "—"}</TableCell>
                      <TableCell>{a.activity?.type ?? "—"}</TableCell>
                      <TableCell>{fmt(a.activity?.date)}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "participated" || a.status === "completed" ? "default" : "secondary"} className="text-xs">
                          {a.status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{a.score != null ? Number(a.score).toFixed(1) : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.notes ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {activities.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma atividade registrada</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Destaques */}
        <TabsContent value="highlights">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {highlights.map(h => (
              <Card key={h.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Star className="size-4 text-yellow-500 shrink-0" />
                      <CardTitle className="text-sm">{h.title ?? "Destaque"}</CardTitle>
                    </div>
                    {h.highlight_type && (
                      <Badge variant="outline" className="text-xs shrink-0">{h.highlight_type}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  {h.description && <p className="text-sm text-muted-foreground">{h.description}</p>}
                  <div className="flex gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                    {h.class_name && <span>Turma: {h.class_name}</span>}
                    {h.teacher_name && <span>Prof: {h.teacher_name}</span>}
                    <span>{fmt(h.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {highlights.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2 py-8 text-center">Nenhum destaque registrado</p>
            )}
          </div>
        </TabsContent>

        {/* Biblioteca */}
        <TabsContent value="loans">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Livro</TableHead>
                    <TableHead>Emprestado em</TableHead>
                    <TableHead>Devolução prevista</TableHead>
                    <TableHead>Devolvido em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map(l => {
                    const st = loanStatus(l)
                    const info = LOAN_STATUS[st]
                    return (
                      <TableRow key={l.id} className={st === "overdue" ? "bg-destructive/5" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <BookMarked className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium">{l.book?.title ?? "—"}</span>
                            {l.book?.author && <span className="text-xs text-muted-foreground">— {l.book.author}</span>}
                          </div>
                        </TableCell>
                        <TableCell>{fmt(l.borrowed_at)}</TableCell>
                        <TableCell>{fmt(l.due_date)}</TableCell>
                        <TableCell>{fmt(l.returned_at)}</TableCell>
                        <TableCell>
                          <Badge variant={info.variant} className="text-xs">{info.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{l.notes ?? "—"}</TableCell>
                      </TableRow>
                    )
                  })}
                  {loans.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum empréstimo registrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
