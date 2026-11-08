"use client"

import { useEffect, useState } from "react"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { statsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { PeriodStats } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Period = PeriodStats["period"]
const PERIODS: [Period, string][] = [
  ["30d", "Últimos 30 dias"], ["semester", "Este semestre"], ["year", "Este ano"], ["custom", "Personalizado"],
]

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function fmtDay(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y.slice(2)}`
}

// Indicadores do período com comparação ao período anterior equivalente.
// Semestre/ano comparam o trecho até hoje com o mesmo trecho do semestre/ano anterior.
// Personalizado compara o intervalo escolhido com o de mesma duração logo antes dele.
export function PeriodComparison() {
  const [period, setPeriod] = useState<Period>("30d")
  const [data, setData] = useState<PeriodStats | null>(null)
  const [startDate, setStartDate] = useState(() => isoDay(new Date(Date.now() - 29 * 864e5)))
  const [endDate, setEndDate] = useState(() => isoDay(new Date()))
  const rangeInvalid = period === "custom" && (!startDate || !endDate || startDate > endDate)

  useEffect(() => {
    if (rangeInvalid) return
    let alive = true
    const range = period === "custom" ? { start_date: startDate, end_date: endDate } : undefined
    statsApi.period(period, range).then(r => { if (alive) setData(r.data) }).catch(() => {})
    return () => { alive = false }
  }, [period, startDate, endDate, rangeInvalid])

  return (
    <section className="space-y-3" aria-label="Comparativo por período">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mr-auto">Evolução</h2>
        <div className="inline-flex rounded-md border overflow-hidden text-sm" role="radiogroup" aria-label="Período">
          {PERIODS.map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={period === value} onClick={() => setPeriod(value)}
              className={cn("px-3 py-1", period === value ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {label}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-2 text-sm w-full sm:w-auto">
            <label className="sr-only" htmlFor="pc-start">Data inicial</label>
            <Input id="pc-start" type="date" className="h-8 w-auto" value={startDate} max={endDate || undefined}
              onChange={e => setStartDate(e.target.value)} />
            <span className="text-muted-foreground">a</span>
            <label className="sr-only" htmlFor="pc-end">Data final</label>
            <Input id="pc-end" type="date" className="h-8 w-auto" value={endDate} min={startDate || undefined}
              onChange={e => setEndDate(e.target.value)} />
            {rangeInvalid && <span className="text-xs text-red-700 dark:text-red-400">Data inicial deve ser anterior à final</span>}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Novos alunos" m={data?.new_students} betterWhen="up" />
        <Metric label="Aulas com chamada" m={data?.lessons_given} betterWhen="up" />
        <Metric label="Frequência média" m={data?.attendance_rate} betterWhen="up" unit="%" points />
        <Metric label="Faltas" m={data?.absences} betterWhen="down" />
      </div>
      {data && (
        <p className="text-xs text-muted-foreground">
          {fmtDay(data.start)} a {fmtDay(data.end)} comparado com {fmtDay(data.previous_start)} a {fmtDay(data.previous_end)}
        </p>
      )}
    </section>
  )
}

function Metric({ label, m, betterWhen, unit = "", points = false }: {
  label: string; m?: { current: number; previous: number }; betterWhen: "up" | "down"; unit?: string; points?: boolean
}) {
  const value = m ? `${m.current.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${unit}` : "…"
  let delta: React.ReactNode = null
  if (m) {
    const diff = m.current - m.previous
    if (m.previous === 0 && !points) {
      delta = <span className="text-muted-foreground">sem base no período anterior</span>
    } else if (diff === 0) {
      delta = <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="size-3.5" />igual ao período anterior</span>
    } else {
      // Frequência: diferença em pontos percentuais; demais: variação relativa
      const txt = points
        ? `${diff > 0 ? "+" : ""}${diff.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.`
        : `${diff > 0 ? "+" : ""}${Math.round(diff / m.previous * 100)}%`
      const good = (diff > 0) === (betterWhen === "up")
      const Icon = diff > 0 ? ArrowUpRight : ArrowDownRight
      delta = (
        <span className={cn("inline-flex items-center gap-1 font-medium", good ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400")}>
          <Icon className="size-3.5" aria-hidden />{txt}
          <span className="sr-only">{good ? "(melhora)" : "(piora)"}</span>
          <span className="font-normal text-muted-foreground">vs anterior</span>
        </span>
      )
    }
  }
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs">{delta}</p>
      </CardContent>
    </Card>
  )
}
