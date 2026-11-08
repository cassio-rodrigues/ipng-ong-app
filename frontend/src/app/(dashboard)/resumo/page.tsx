"use client"

import { useMemo, useState } from "react"
import { Copy, FileText, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { statsApi } from "@/lib/api"
import { aiInstruction, anonymize, buildSummaryText } from "@/lib/report-summary"
import type { ReportSummary } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

async function copy(text: string, ok: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(ok)
  } catch {
    toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.")
  }
}

// Resumo das aulas de um período: monta o texto aqui mesmo (sem IA) e oferece uma versão
// pronta para colar numa IA, com os nomes trocados por rótulos.
export default function ResumoPage() {
  const today = new Date()
  const [start, setStart] = useState(isoDay(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [end, setEnd] = useState(isoDay(today))
  const [data, setData] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [hideNames, setHideNames] = useState(true)
  const invalid = !start || !end || start > end

  const text = useMemo(() => (data ? buildSummaryText(data) : ""), [data])

  function generate() {
    if (invalid) return
    setLoading(true)
    statsApi.reportSummary(start, end)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  function copyForAI() {
    if (!data) return
    const body = hideNames ? anonymize(text, data) : text
    copy(aiInstruction(hideNames) + body, "Copiado. Cole na sua IA (Claude, ChatGPT…) para gerar o texto redigido.")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><FileText className="size-6" aria-hidden />Resumo das aulas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Junta os números do período e os relatórios de aula de todas as turmas num texto pronto para copiar.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rs-start">De</Label>
            <Input id="rs-start" type="date" value={start} max={end || undefined} onChange={e => setStart(e.target.value)} className="w-auto" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rs-end">Até</Label>
            <Input id="rs-end" type="date" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)} className="w-auto" />
          </div>
          <Button onClick={generate} disabled={invalid || loading}>{loading ? "Gerando…" : "Gerar resumo"}</Button>
          {invalid && <p className="text-xs text-red-700 dark:text-red-400 w-full">A data inicial deve ser anterior à final.</p>}
        </CardContent>
      </Card>

      {data && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => copy(text, "Resumo copiado")}><Copy />Copiar texto</Button>
            <Button variant="outline" onClick={copyForAI}><Sparkles />Copiar para IA</Button>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hideNames} onChange={e => setHideNames(e.target.checked)} className="size-4" />
              Ocultar nomes de alunos e professores ao copiar para IA
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            “Copiar para IA” leva o texto com uma instrução de resumo. Cole numa IA de sua escolha para receber um texto redigido.
            A troca de nomes cobre nomes completos e primeiros nomes cadastrados; revise antes de enviar se as observações citarem apelidos ou outros dados pessoais.
          </p>
          {data.classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma aula no período escolhido.</p>
          ) : (
            <textarea
              readOnly
              value={text}
              rows={28}
              aria-label="Texto do resumo"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
        </div>
      )}
    </div>
  )
}
