"use client"

import { Fragment, useEffect, useState } from "react"
import { toast } from "sonner"
import { useParams, useRouter } from "next/navigation"
import { studentsApi, alertsApi } from "@/lib/api"
import { useAlerts, ALERTS_CHANGED } from "@/hooks/use-alerts"
import { AlertList, ALERT_META } from "@/components/shared/AlertList"
import { WhatsAppSendDialog } from "@/components/shared/WhatsAppSendDialog"
import { whatsappNumber } from "@/lib/whatsapp"
import { gradeLevel, GRADE_TEXT } from "@/lib/grades"
import { highlightBadgeClass, HIGHLIGHT_LABEL } from "@/lib/highlights"
import type { Followup } from "@/types"
import { useAuth } from "@/hooks/use-auth"
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
  Trash2,
  AlertTriangle,
  Plus,
  MessageCircle,
  Download,
  UserX,
} from "lucide-react"
import { NewLoanDialog } from "@/components/shared/NewLoanDialog"
import { cn } from "@/lib/utils"
import { attendanceLevel, absenceLevel, formatRate, ATTENDANCE_TEXT, ATTENDANCE_LEVEL_LABEL } from "@/lib/attendance"

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
  id: string; status: string | null; notes: string | null; homework_status: string | null; recorded_by_name: string | null
  lesson: { id: string; scheduled_at: string | null; class_name: string | null } | null
}
interface AttendanceSummary {
  total: number; present: number; absent: number; late: number; justified: number; rate: number
  records: AttendanceItem[]
}
interface GradeItem {
  id: string; score: number | null; feedback: string | null; created_at: string | null
  assessment: { id: string; title: string | null; type: string | null; semester: string | null; date: string | null; max_score: number | null; class_name: string | null
    book_id: string | null; book_title: string | null; book_level: string | null } | null
}

interface GradeGroup { key: string; title: string; level: string | null; grades: GradeItem[]; average: number | null }

// Nota em escala 0–10 (mesma escala das cores de gradeLevel)
function gradeOn10(g: GradeItem): number | null {
  if (g.score == null) return null
  const max = g.assessment?.max_score
  return max ? Number(g.score) / max * 10 : Number(g.score)
}

// Notas agrupadas por livro/módulo da turma, do módulo mais antigo ao mais recente
function groupGradesByBook(grades: GradeItem[]): GradeGroup[] {
  const groups = new Map<string, GradeGroup>()
  for (const g of grades) {
    const a = g.assessment
    const key = a?.book_id ?? `class:${a?.class_name ?? ""}`
    const title = a?.book_title ?? (a?.class_name ? `${a.class_name} (turma sem livro)` : "Sem livro")
    if (!groups.has(key)) groups.set(key, { key, title, level: a?.book_level ?? null, grades: [], average: null })
    groups.get(key)!.grades.push(g)
  }
  const when = (g: GradeItem) => g.assessment?.date ?? g.created_at ?? ""
  return [...groups.values()]
    .map(gr => {
      const sorted = [...gr.grades].sort((x, y) => when(x).localeCompare(when(y)))
      const vals = sorted.map(gradeOn10).filter((v): v is number => v !== null)
      return { ...gr, grades: sorted, average: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null }
    })
    .sort((x, y) => when(x.grades[0]).localeCompare(when(y.grades[0])))
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
  const { canEdit } = useAuth()
  const [history, setHistory] = useState<History | null>(null)
  const [loading, setLoading] = useState(true)
  const [loanOpen, setLoanOpen] = useState(false)
  const [waOpen, setWaOpen] = useState(false)

  const { alerts } = useAlerts({ student_id: id })
  const [followups, setFollowups] = useState<Followup[]>([])

  useEffect(() => {
    const loadFollowups = () => alertsApi.followups(id).then(r => setFollowups(r.data)).catch(() => {})
    loadFollowups()
    window.addEventListener(ALERTS_CHANGED, loadFollowups)
    return () => window.removeEventListener(ALERTS_CHANGED, loadFollowups)
  }, [id])

  useEffect(() => {
    studentsApi.getHistory(id)
      .then(r => setHistory(r.data))
      .finally(() => setLoading(false))
  }, [id])

  // Cópia completa dos dados do aluno, para atender pedidos de acesso (LGPD art. 18, II)
  async function exportPersonalData() {
    const [studentRes, historyRes, followRes] = await Promise.all([
      studentsApi.get(id), studentsApi.getHistory(id), alertsApi.followups(id),
    ])
    const payload = {
      gerado_em: new Date().toISOString(),
      aviso: "Dados pessoais tratados pelo Inglês Para Nossa Gente sobre este aluno.",
      cadastro: studentRes.data,
      historico: historyRes.data,
      acompanhamentos: followRes.data,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `dados_${(studentRes.data.full_name ?? "aluno").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleAnonymize() {
    if (!confirm(
      "Anonimizar este aluno?\n\nNome, contato, documentos, endereço e dados do responsável serão apagados de forma definitiva. " +
      "Frequência, notas e turmas continuam nas estatísticas, sem identificar a pessoa. Exporte os dados antes, se o aluno pediu uma cópia."
    )) return
    await studentsApi.anonymize(id)
    toast.success("Aluno anonimizado")
    await reloadHistory()
  }

  async function reloadHistory() {
    const r = await studentsApi.getHistory(id)
    setHistory(r.data)
  }

  async function handleRemoveEnrollment(enrollmentId: string, className: string) {
    if (!confirm(`Remover matrícula de "${className}"?`)) return
    await studentsApi.deleteEnrollment(id, enrollmentId)
    const r = await studentsApi.getHistory(id)
    setHistory(r.data)
  }

  if (loading) return <p className="text-muted-foreground text-sm p-6">Carregando…</p>
  if (!history) return <p className="text-sm text-destructive p-6">Aluno não encontrado.</p>

  const { student, enrollments, attendance, grades, activities, highlights, loans } = history

  const avgGrade = grades.length > 0
    ? (grades.reduce((s, g) => s + (g.score ?? 0), 0) / grades.length).toFixed(1)
    : null

  const attLevel = attendanceLevel(attendance.rate, attendance.total)
  const attRateLabel = attLevel === "none" ? "—" : formatRate(attendance.rate)

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
            {student.phone && <> · {student.phone}</>}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={exportPersonalData} title="Gera um arquivo com todos os dados do aluno, para pedidos de acesso (LGPD)">
            <Download className="size-4 mr-1.5" />Exportar dados
          </Button>
        )}
        {canEdit && student.full_name !== "Aluno anonimizado" && (
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={handleAnonymize}
            title="Apaga os dados que identificam o aluno, mantendo o histórico nas estatísticas (LGPD)">
            <UserX className="size-4 mr-1.5" />Anonimizar
          </Button>
        )}
        {whatsappNumber(student.phone) && (
          <>
            <Button size="sm" className="bg-[#25D366] text-white hover:bg-[#1ebe5b]" onClick={() => setWaOpen(true)}>
              <MessageCircle className="size-4 mr-1.5" />WhatsApp
            </Button>
            <WhatsAppSendDialog
              open={waOpen} onOpenChange={setWaOpen}
              title={`WhatsApp — ${student.full_name ?? ""}`}
              recipients={[{
                id: student.id, name: student.full_name, phone: student.phone,
                className: enrollments.filter(e => e.status === "active").map(e => e.class_?.name).filter(Boolean).join(", ") || null,
              }]}
            />
          </>
        )}
      </div>

      {alerts.length > 0 && (
        <section aria-label="Pendências do aluno">
          <AlertList alerts={alerts} hideStudent emptyText={null} />
        </section>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className={cn("col-span-1", attLevel === "critical" && "border-red-500 bg-red-50 dark:bg-red-950/30")}>
          <CardContent className="pt-4 pb-4">
            <StatBadge value={attRateLabel} label={attLevel === "ok" ? "Frequência" : `Frequência · ${ATTENDANCE_LEVEL_LABEL[attLevel]}`} color={ATTENDANCE_TEXT[attLevel]} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <StatBadge value={attendance.present} label="Presenças" color="text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <StatBadge
              value={attendance.absent}
              label={attendance.total ? `Faltas · ${Math.round(attendance.absent / attendance.total * 100)}% das aulas` : "Faltas"}
              color={ATTENDANCE_TEXT[absenceLevel(attendance.absent, attendance.total)]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <StatBadge
              value={avgGrade ?? "—"}
              label="Média geral"
              color={GRADE_TEXT[gradeLevel(avgGrade)]}
            />
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
                    {canEdit && <TableHead className="w-10" />}
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
                      {canEdit && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveEnrollment(e.id, e.class_?.name ?? "turma")}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      )}
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
          <TabsTrigger value="followups">Acompanhamento ({followups.length})</TabsTrigger>
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
                <div className={cn("ml-auto flex items-center gap-1.5 text-sm font-medium", ATTENDANCE_TEXT[attLevel])}>
                  {attLevel === "critical" ? <AlertTriangle className="size-4" /> : <TrendingUp className="size-4" />}
                  {attRateLabel} de frequência
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
                    <TableHead>Dever</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead>Registrado por</TableHead>
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
                      <TableCell className="text-xs">
                        {a.homework_status === "done" && <span className="text-green-600 dark:text-green-400">Fez</span>}
                        {a.homework_status === "not_done" && <span className="font-medium text-red-600 dark:text-red-400">Não fez</span>}
                        {a.homework_status === "na" && <span className="text-muted-foreground">N/A</span>}
                        {!a.homework_status && <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.notes ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.recorded_by_name ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {attendance.records.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma aula registrada</TableCell></TableRow>
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
                  {groupGradesByBook(grades).map(group => (
                    <Fragment key={group.key}>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableCell colSpan={7} className="py-2">
                          <div className="flex items-center gap-2 text-sm">
                            <BookOpen className="size-4 text-muted-foreground" />
                            <span className="font-semibold">{group.title}</span>
                            {group.level && <Badge variant="outline" className="text-[10px]">{group.level}</Badge>}
                            <span className="text-xs text-muted-foreground">· {group.grades.length} {group.grades.length === 1 ? "avaliação" : "avaliações"}</span>
                            {group.average !== null && (
                              <span className={cn("ml-auto text-xs font-semibold", GRADE_TEXT[gradeLevel(group.average)])}>
                                Média {group.average.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                  {group.grades.map(g => {
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
                    </Fragment>
                  ))}
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
                      <Badge className={`text-xs shrink-0 ${highlightBadgeClass(h.highlight_type)}`}>{HIGHLIGHT_LABEL[h.highlight_type] ?? h.highlight_type}</Badge>
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
          {canEdit && (
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => setLoanOpen(true)}><Plus className="size-4 mr-2" />Novo empréstimo</Button>
              <NewLoanDialog open={loanOpen} onOpenChange={setLoanOpen} student={student} onCreated={reloadHistory} />
            </div>
          )}
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

        {/* Acompanhamento: ações registradas sobre pendências */}
        <TabsContent value="followups">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Data</TableHead>
                    <TableHead>Pendência</TableHead>
                    <TableHead>O que foi feito</TableHead>
                    <TableHead className="w-40">Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followups.map(f => (
                    <TableRow key={f.id}>
                      <TableCell>{fmt(f.created_at)}</TableCell>
                      <TableCell>
                        {ALERT_META[f.alert_type]?.label ?? f.alert_type}
                        {f.resolution === "snoozed" && <Badge variant="outline" className="ml-2 text-xs">Adiado até {fmt(f.snooze_until)}</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">{f.note ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.created_by_name ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {followups.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma ação registrada</TableCell></TableRow>
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
