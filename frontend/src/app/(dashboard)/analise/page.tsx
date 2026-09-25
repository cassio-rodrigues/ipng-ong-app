"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import * as XLSX from "xlsx"
import { BarChart3, Download, Printer, X } from "lucide-react"
import { statsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { exportToExcel } from "@/lib/excel"
import type { AnalysisStudent } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AttendanceRate } from "@/components/shared/AttendanceRate"

// ── Dimensões ──────────────────────────────────────────────────────────────────
// Cada dimensão extrai uma ou mais categorias por aluno (livro/nível: o aluno pode estar
// em várias turmas). A ordem das categorias é fixa (ordinal) para as barras não pularem.

const NONE = "Não informado"
const GENDER: Record<string, string> = { M: "Masculino", F: "Feminino", O: "Outro" }
const EDUCATION: Record<string, string> = {
  fundamental_incompleto: "Fundamental incompleto", fundamental_completo: "Fundamental completo",
  medio_incompleto: "Médio incompleto", medio_completo: "Médio completo",
  superior_incompleto: "Superior incompleto", superior_completo: "Superior completo",
  pos_graduacao: "Pós-graduação",
}
const AGE_BANDS: [number, number, string][] = [
  [0, 10, "Até 10"], [11, 14, "11 a 14"], [15, 17, "15 a 17"], [18, 24, "18 a 24"],
  [25, 39, "25 a 39"], [40, 59, "40 a 59"], [60, 200, "60+"],
]
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]

interface Dimension {
  key: string
  label: string
  values: (s: AnalysisStudent) => string[]
  order?: string[]   // ordem fixa; categorias fora dela vão ao fim, por contagem
}

const DIMENSIONS: Dimension[] = [
  { key: "gender", label: "Gênero", values: s => [GENDER[s.gender ?? ""] ?? NONE], order: ["Feminino", "Masculino", "Outro", NONE] },
  {
    key: "age", label: "Faixa etária",
    values: s => [s.age === null ? NONE : AGE_BANDS.find(([a, b]) => s.age! >= a && s.age! <= b)?.[2] ?? NONE],
    order: [...AGE_BANDS.map(b => b[2]), NONE],
  },
  { key: "education", label: "Escolaridade", values: s => [EDUCATION[s.education_level ?? ""] ?? NONE], order: [...Object.values(EDUCATION), NONE] },
  { key: "unit", label: "Unidade", values: s => [s.unit_name ?? NONE] },
  { key: "book", label: "Livro / módulo", values: s => s.classes.length ? [...new Set(s.classes.map(c => c.book ?? "Sem livro"))] : ["Sem turma"] },
  { key: "level", label: "Nível", values: s => s.classes.length ? [...new Set(s.classes.map(c => c.level ?? "Sem nível"))] : ["Sem turma"], order: [...LEVELS, "Sem nível", "Sem turma"] },
]

type Filters = Record<string, Set<string>>

function matches(s: AnalysisStudent, filters: Filters, skip?: string) {
  return DIMENSIONS.every(d => {
    if (d.key === skip) return true
    const sel = filters[d.key]
    return !sel || sel.size === 0 || d.values(s).some(v => sel.has(v))
  })
}

export default function AnalisePage() {
  const [students, setStudents] = useState<AnalysisStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [onlyActive, setOnlyActive] = useState(true)
  const [filters, setFilters] = useState<Filters>({})

  useEffect(() => {
    statsApi.analysis().then(r => setStudents(r.data)).finally(() => setLoading(false))
  }, [])

  const base = useMemo(() => students.filter(s => !onlyActive || s.status === "active"), [students, onlyActive])
  const filtered = useMemo(() => base.filter(s => matches(s, filters)), [base, filters])
  const activeChips = DIMENSIONS.flatMap(d => [...(filters[d.key] ?? [])].map(v => ({ dim: d, value: v })))

  function toggle(dim: string, value: string) {
    setFilters(f => {
      const next = new Set(f[dim] ?? [])
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return { ...f, [dim]: next }
    })
  }

  function exportRows() {
    return filtered.map(s => ({
      "Nome": s.full_name ?? "",
      "Gênero": GENDER[s.gender ?? ""] ?? "",
      "Idade": s.age ?? "",
      "Escolaridade": EDUCATION[s.education_level ?? ""] ?? "",
      "Unidade": s.unit_name ?? "",
      "Turmas": s.classes.map(c => c.name).join(", "),
      "Livros": [...new Set(s.classes.map(c => c.book).filter(Boolean))].join(", "),
      "Frequência (%)": s.attendance_rate ?? "",
      "Status": s.status === "active" ? "Ativo" : "Inativo",
    }))
  }

  function exportCsv() {
    const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(exportRows()))
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })  // BOM: acentos no Excel
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "analise_alunos.csv"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="bg-blue-600 rounded-xl p-2.5 text-white shadow-sm print:hidden"><BarChart3 className="size-5" /></div>
          <div>
            <h1 className="text-2xl font-bold">Análise</h1>
            <p className="text-sm text-muted-foreground">Clique nas barras para filtrar. Os filtros se cruzam e tudo se recalcula.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}><Download className="size-4 mr-2" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportToExcel(exportRows(), "analise_alunos")} disabled={!filtered.length}><Download className="size-4 mr-2" />Excel</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="size-4 mr-2" />PDF / imprimir</Button>
        </div>
      </div>

      {/* Filtros ativos: uma linha, acima dos gráficos */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border overflow-hidden text-sm print:hidden" role="radiogroup" aria-label="Status dos alunos">
          {([[true, "Ativos"], [false, "Todos"]] as const).map(([v, label]) => (
            <button key={label} type="button" role="radio" aria-checked={onlyActive === v} onClick={() => setOnlyActive(v)}
              className={cn("px-3 py-1", onlyActive === v ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {label}
            </button>
          ))}
        </div>
        {activeChips.map(({ dim, value }) => (
          <button key={`${dim.key}:${value}`} type="button" onClick={() => toggle(dim.key, value)}
            className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-sm hover:bg-muted">
            <span className="text-muted-foreground">{dim.label}:</span> {value}
            <X className="size-3.5" aria-label="remover filtro" />
          </button>
        ))}
        {activeChips.length > 0 && (
          <button type="button" onClick={() => setFilters({})} className="text-sm text-muted-foreground underline print:hidden">Limpar filtros</button>
        )}
      </div>

      {/* Número principal */}
      <div aria-live="polite">
        <p className="text-5xl font-semibold tabular-nums leading-none">{loading ? "…" : filtered.length.toLocaleString("pt-BR")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtered.length === 1 ? "aluno" : "alunos"}
          {activeChips.length > 0 && !loading && <> de {base.length.toLocaleString("pt-BR")} {onlyActive ? "ativos" : "no total"}</>}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {DIMENSIONS.map(d => (
          <DimensionCard
            key={d.key} dim={d}
            // Cada gráfico conta com os OUTROS filtros aplicados, para mostrar as opções da própria dimensão
            students={base.filter(s => matches(s, filters, d.key))}
            selected={filters[d.key] ?? new Set()}
            onToggle={v => toggle(d.key, v)}
          />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Alunos filtrados</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead><TableHead>Gênero</TableHead><TableHead className="w-16">Idade</TableHead>
                <TableHead>Escolaridade</TableHead><TableHead>Unidade</TableHead><TableHead>Turmas</TableHead>
                <TableHead className="w-28 text-right">Frequência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 300).map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium"><Link href={`/students/${s.id}`} className="hover:underline">{s.full_name ?? "—"}</Link></TableCell>
                  <TableCell>{GENDER[s.gender ?? ""] ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{s.age ?? "—"}</TableCell>
                  <TableCell>{EDUCATION[s.education_level ?? ""] ?? "—"}</TableCell>
                  <TableCell>{s.unit_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{s.classes.map(c => c.name).join(", ") || "—"}</TableCell>
                  <TableCell className="text-right">
                    {s.attendance_rate === null ? <span className="text-muted-foreground">—</span> : <AttendanceRate rate={s.attendance_rate} />}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum aluno com esses filtros</TableCell></TableRow>}
            </TableBody>
          </Table>
          {filtered.length > 300 && <p className="px-4 py-2 text-xs text-muted-foreground">Mostrando 300 de {filtered.length}. Exporte para ver todos.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

// Barras horizontais de uma série (contagem por categoria). Sem seleção: todas na cor da série;
// com seleção na dimensão: selecionadas na cor, demais em cinza (ênfase).
function DimensionCard({ dim, students, selected, onToggle }: {
  dim: Dimension; students: AnalysisStudent[]; selected: Set<string>; onToggle: (v: string) => void
}) {
  const counts = new Map<string, number>()
  for (const s of students) for (const v of dim.values(s)) counts.set(v, (counts.get(v) ?? 0) + 1)
  // Mantém visível uma categoria selecionada mesmo se zerar com outros filtros
  for (const v of selected) if (!counts.has(v)) counts.set(v, 0)

  const rows = [...counts.entries()].sort((a, b) => {
    const order = dim.order ?? []
    const ia = order.indexOf(a[0]), ib = order.indexOf(b[0])
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    return b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")
  })
  const max = Math.max(1, ...rows.map(r => r[1]))
  const total = students.length

  return (
    <Card className="break-inside-avoid">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{dim.label}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Sem dados</p>}
        <ul className="space-y-1">
          {rows.map(([value, n]) => {
            const isSel = selected.has(value)
            const dimmed = selected.size > 0 && !isSel
            const pct = total ? Math.round(n / total * 100) : 0
            return (
              <li key={value}>
                <button
                  type="button" onClick={() => onToggle(value)} aria-pressed={isSel}
                  title={`${value}: ${n} ${n === 1 ? "aluno" : "alunos"} (${pct}%) — clique para ${isSel ? "remover o" : "filtrar"}`}
                  className={cn("group grid w-full grid-cols-[minmax(0,9rem)_1fr] items-center gap-2 rounded px-1 py-1 text-left text-sm hover:bg-muted/60", isSel && "bg-muted")}
                >
                  <span className={cn("truncate", isSel ? "font-semibold" : "text-muted-foreground")}>{value}</span>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-4 max-h-6 rounded-r-[4px] transition-all",
                        dimmed ? "bg-muted-foreground/25" : "bg-[#2a78d6] dark:bg-[#3987e5]",
                        "group-hover:opacity-90",
                      )}
                      style={{ width: `${Math.max(n / max * 100, n > 0 ? 2 : 0)}%` }}
                    />
                    <span className="tabular-nums text-xs text-foreground">{n}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
