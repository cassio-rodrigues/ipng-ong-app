"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useAlerts } from "@/hooks/use-alerts"
import { AlertList, ALERT_META } from "@/components/shared/AlertList"
import type { AlertType } from "@/types"

const ORDER: AlertType[] = [
  "attendance_risk", "class_without_teacher", "lesson_missing_attendance",
  "low_grade", "negative_highlight", "teacher_inactive", "homework_check", "lesson_on_holiday", "overdue_loan",
  "positive_highlight",
]

export default function PendenciasPage() {
  const { alerts, loading } = useAlerts()
  const [filter, setFilter] = useState<AlertType | "all">("all")

  const counts = Object.fromEntries(ORDER.map(t => [t, alerts.filter(a => a.type === t).length])) as Record<AlertType, number>
  const shown = filter === "all" ? alerts : alerts.filter(a => a.type === filter)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pendências</h1>
        <p className="text-sm text-muted-foreground">
          Situações que pedem ação. Ao registrar o que foi feito, a pendência sai da lista e fica no histórico do aluno.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="Todas" count={alerts.length} />
        {ORDER.filter(t => counts[t] > 0).map(t => (
          <FilterChip key={t} active={filter === t} onClick={() => setFilter(t)} label={ALERT_META[t].label} count={counts[t]} />
        ))}
      </div>

      {loading
        ? <p className="text-muted-foreground text-sm">Carregando…</p>
        : <AlertList alerts={shown} emptyText="Nenhuma pendência no momento. 🎉" />}
    </div>
  )
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted",
      )}
    >
      {label}
      <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-primary-foreground/20" : "bg-muted")}>{count}</span>
    </button>
  )
}
