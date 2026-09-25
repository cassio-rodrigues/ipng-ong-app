"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { AlertTriangle, ThumbsDown, NotebookPen, BookMarked, CheckCircle2, Clock, History, CalendarX2, TrendingDown, Sparkles, UserX, ClipboardX, UserRoundX } from "lucide-react"
import { WhatsAppButton } from "@/components/shared/WhatsAppButton"
import { firstName } from "@/lib/whatsapp"
import { alertsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { notifyAlertsChanged } from "@/hooks/use-alerts"
import type { Alert, AlertType } from "@/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export const ALERT_META: Record<AlertType, { label: string; icon: typeof AlertTriangle; tone: string }> = {
  attendance_risk:    { label: "Risco de evasão",      icon: AlertTriangle, tone: "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  negative_highlight: { label: "Destaque negativo",    icon: ThumbsDown,    tone: "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" },
  homework_check:     { label: "Checar dever de casa", icon: NotebookPen,   tone: "border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  overdue_loan:       { label: "Empréstimo atrasado",  icon: BookMarked,    tone: "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  lesson_on_holiday:  { label: "Aula em feriado",      icon: CalendarX2,    tone: "border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" },
  low_grade:          { label: "Nota baixa",           icon: TrendingDown,  tone: "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
  class_without_teacher:     { label: "Turma sem professor",       icon: UserX,      tone: "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  lesson_missing_attendance: { label: "Aula sem presença lançada", icon: ClipboardX, tone: "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  teacher_inactive:          { label: "Voluntário sem lançar presença", icon: UserRoundX, tone: "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  positive_highlight:        { label: "Destaque positivo",         icon: Sparkles,   tone: "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
}

// Mensagem sugerida para contato direto com o aluno a partir da pendência
function whatsappMessage(a: Alert): string | null {
  const nome = firstName(a.student_name)
  switch (a.type) {
    case "attendance_risk":
      return `Olá, ${nome}! Aqui é do Inglês Para Nossa Gente. Sentimos sua falta nas aulas${a.class_name ? ` da turma ${a.class_name}` : ""}. Está tudo bem? Podemos ajudar em algo para você continuar com a gente?`
    case "overdue_loan":
      return `Olá, ${nome}! Aqui é do Inglês Para Nossa Gente. Passando para lembrar da devolução do livro emprestado (${a.detail.split(" · ")[0]}). Pode trazer na próxima aula?`
    case "low_grade":
      return `Olá, ${nome}! Aqui é do Inglês Para Nossa Gente. Vimos que a última avaliação foi um pouco difícil. Vamos combinar um reforço para você chegar mais confiante na próxima?`
    case "negative_highlight":
      return `Olá, ${nome}! Aqui é do Inglês Para Nossa Gente. Gostaríamos de conversar um pouquinho sobre como estão as aulas para você. Quando fica bom?`
    default:
      return null
  }
}

function teacherMessage(a: Alert): string | null {
  if (a.type !== "teacher_inactive") return null
  return `Olá, ${firstName(a.teacher_name)}! Aqui é da coordenação do Inglês Para Nossa Gente. Notamos que as últimas chamadas da sua turma não foram lançadas no sistema. Está tudo bem? Precisa de ajuda com algo?`
}

// Sugestões de ação por tipo — só texto de apoio no diálogo
const ACTION_HINT: Record<AlertType, string> = {
  attendance_risk: "Ex.: liguei para o responsável, aluno voltará na próxima aula.",
  negative_highlight: "Ex.: conversei com o aluno e com a professora; combinamos reforço.",
  homework_check: "Opcional: quem não fez, observações.",
  overdue_loan: "Ex.: aluno devolverá na próxima aula / livro perdido.",
  lesson_on_holiday: "Ex.: aula cancelada / remarcada para 03/10.",
  low_grade: "Ex.: combinamos reforço com a professora / nova avaliação.",
  class_without_teacher: "Ex.: professora X assume a partir de 05/10.",
  lesson_missing_attendance: "Ex.: professor lançou em papel / aula não aconteceu (cancelar).",
  teacher_inactive: "Ex.: conversei com o voluntário, volta semana que vem / precisa de substituto.",
  positive_highlight: "Ex.: indicado para o Day Out / mentoria / intercâmbio.",
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : ""
}
function fmtDateTime(d: string | null) {
  return d ? new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""
}

function alertHref(a: Alert) {
  if ((a.type === "homework_check" || a.type === "lesson_on_holiday") && a.lesson_id) return `/lessons/${a.lesson_id}`
  if (a.type === "overdue_loan") return "/loans"
  if (a.type === "class_without_teacher" && a.class_id) return `/classes/${a.class_id}?tab=professores`
  if (a.type === "lesson_missing_attendance" && a.lesson_id) return `/lessons/${a.lesson_id}?tab=attendance`
  if (a.type === "teacher_inactive") return null
  return a.student_id ? `/students/${a.student_id}` : null
}

export function AlertList({
  alerts,
  hideStudent = false,
  hideClass = false,
  emptyText = "Nenhuma pendência. 🎉",
}: {
  alerts: Alert[]
  hideStudent?: boolean
  hideClass?: boolean
  emptyText?: string | null
}) {
  const [acting, setActing] = useState<Alert | null>(null)

  if (alerts.length === 0) {
    return emptyText ? <p className="text-sm text-muted-foreground py-4">{emptyText}</p> : null
  }

  return (
    <>
      <ul className="space-y-2">
        {alerts.map(a => {
          const meta = ALERT_META[a.type]
          const Icon = meta.icon
          const href = alertHref(a)
          return (
            <li key={a.key} className={cn("flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border-l-4 border bg-card p-3", meta.tone.split(" ")[0])}>
              <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", meta.tone)}>
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-foreground">
                  {meta.label}
                  {!hideStudent && a.student_name && (
                    <> · {href && a.student_id && !a.lesson_id
                      ? <Link href={href} className="hover:underline">{a.student_name}</Link>
                      : a.student_name}</>
                  )}
                </p>
                <p className="text-foreground/90">
                  {(a.type === "homework_check" || a.type === "lesson_on_holiday" || a.type === "lesson_missing_attendance") && a.occurred_at && <>Aula de {fmtDateTime(a.occurred_at)}: </>}
                  {a.detail}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {!hideClass && a.class_name && <>{a.class_id ? <Link href={`/classes/${a.class_id}`} className="hover:underline">{a.class_name}</Link> : a.class_name}</>}
                  {!hideClass && a.class_name && a.occurred_at && !a.lesson_id && " · "}
                  {a.type === "attendance_risk" && a.occurred_at && <>última falta em {fmtDate(a.occurred_at)}</>}
                  {(a.type === "negative_highlight" || a.type === "low_grade") && a.occurred_at && <>registrado em {fmtDate(a.occurred_at)}</>}
                  {a.type === "overdue_loan" && a.occurred_at && <>vencimento {fmtDate(a.occurred_at)}</>}
                </p>
                {a.last_followup && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                    <History className="size-3.5 mt-px shrink-0" />
                    <span>
                      {a.last_followup.resolution === "snoozed" ? "Adiado" : "Tratado"} em {fmtDate(a.last_followup.created_at)}
                      {a.last_followup.created_by_name && <> por {a.last_followup.created_by_name}</>}
                      {a.last_followup.note && <>: “{a.last_followup.note}”</>}
                      {a.last_followup.resolution === "resolved" && " — voltou por fato novo"}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {a.student_phone && whatsappMessage(a) && (
                  <WhatsAppButton phone={a.student_phone} message={whatsappMessage(a)!} iconOnly label={`WhatsApp de ${a.student_name ?? "aluno"}`} />
                )}
                {a.teacher_phone && teacherMessage(a) && (
                  <WhatsAppButton phone={a.teacher_phone} message={teacherMessage(a)!} iconOnly label={`WhatsApp de ${a.teacher_name ?? "voluntário"}`} />
                )}
                {a.type === "class_without_teacher" && href && (
                  <Button asChild variant="outline" size="sm"><Link href={href}>Atribuir professor</Link></Button>
                )}
                {href && a.lesson_id && (
                  <Button asChild variant="outline" size="sm"><Link href={href}>Abrir aula</Link></Button>
                )}
                <Button size="sm" variant={a.severity === "high" ? "default" : a.severity === "low" ? "outline" : "secondary"} onClick={() => setActing(a)}>
                  {a.type === "homework_check" ? "Dever checado" : "Registrar ação"}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
      <FollowupDialog alert={acting} onClose={() => setActing(null)} />
    </>
  )
}

function FollowupDialog({ alert, onClose }: { alert: Alert | null; onClose: () => void }) {
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit(resolution: "resolved" | "snoozed") {
    if (!alert) return
    setSaving(true)
    try {
      await alertsApi.createFollowup({
        alert_type: alert.type, ref_id: alert.ref_id, student_id: alert.student_id,
        resolution, note: note.trim() || undefined, snooze_days: 7,
      })
      toast.success(resolution === "resolved" ? "Ação registrada" : "Pendência adiada por 7 dias")
      setNote("")
      onClose()
      notifyAlertsChanged()
    } finally {
      setSaving(false)
    }
  }

  const meta = alert ? ALERT_META[alert.type] : null
  return (
    <Dialog open={!!alert} onOpenChange={open => { if (!open) { setNote(""); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{meta?.label}{alert?.student_name && ` · ${alert.student_name}`}</DialogTitle>
          <DialogDescription>{alert?.detail}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="followup-note">O que foi feito?</Label>
          <textarea
            id="followup-note"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={alert ? ACTION_HINT[alert.type] : ""}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {alert?.type === "attendance_risk"
              ? "A pendência some e só volta se o aluno faltar de novo."
              : "O registro fica no histórico do aluno."}
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          {alert?.type !== "homework_check" && (
            <Button variant="outline" disabled={saving} onClick={() => submit("snoozed")}>
              <Clock className="size-4 mr-2" />Adiar 7 dias
            </Button>
          )}
          <Button disabled={saving} onClick={() => submit("resolved")}>
            <CheckCircle2 className="size-4 mr-2" />{alert?.type === "homework_check" ? "Dever checado" : "Resolvido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
