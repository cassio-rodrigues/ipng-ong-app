import type { ReportSummary, SummaryLesson } from "@/types"
import { HIGHLIGHT_LABEL } from "@/lib/highlights"

function day(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

function shortDay(iso: string) {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}

const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`

function hasReport(l: SummaryLesson) {
  return Boolean(l.summary || l.activities_done || l.homework || l.observations)
}

// Texto corrido, sem IA: números gerais + o que cada turma registrou nas aulas do período
export function buildSummaryText(d: ReportSummary): string {
  const out: string[] = []
  out.push(`RESUMO DAS AULAS — ${day(d.start)} a ${day(d.end)}`, "")
  out.push("VISÃO GERAL")
  out.push(`- Alunos ativos: ${d.active_students} · Novos alunos no período: ${d.new_students}`)
  out.push(`- Aulas com chamada: ${d.lessons_given} · Aulas com relatório preenchido: ${d.lessons_with_report}`)
  out.push(`- Frequência média: ${pct(d.attendance_rate)} · Faltas: ${d.absences}`)
  out.push(`- Turmas com aula no período: ${d.classes.length}`)

  const noReport = d.classes.filter(c => c.lessons.length && !c.lessons.some(hasReport))
  if (noReport.length) out.push(`- Turmas sem nenhum relatório no período: ${noReport.map(c => c.name ?? "Sem nome").join(", ")}`)
  const lowTotal = d.classes.reduce((n, c) => n + c.low_attendance.length, 0)
  if (lowTotal) out.push(`- Alunos com frequência abaixo de 60% no período: ${lowTotal}`)

  for (const c of d.classes) {
    out.push("", "")
    const meta = [c.unit && `Unidade ${c.unit}`, c.level, c.teacher && `professor(a): ${c.teacher}`].filter(Boolean).join(" · ")
    out.push(`TURMA ${c.name ?? "Sem nome"}${meta ? ` (${meta})` : ""}`)
    const reported = c.lessons.filter(hasReport)
    out.push(`${c.lessons.length} aula(s), ${reported.length} com relatório` +
      (c.attendance_rate != null ? ` · Frequência: ${pct(c.attendance_rate)}` : " · Sem chamada lançada"))
    if (c.low_attendance.length) {
      out.push("Frequência abaixo de 60%: " + c.low_attendance
        .map(s => `${s.name} (${pct(s.rate)}, ${s.absences} falta(s) em ${s.total} aula(s))`).join("; "))
    }
    for (const l of reported) {
      const head = [shortDay(l.date), l.chapter, l.total ? `presença ${l.attended}/${l.total}` : null].filter(Boolean).join(" — ")
      out.push("", `• ${head}`)
      if (l.summary) out.push(`  Resumo: ${l.summary.trim()}`)
      if (l.activities_done) out.push(`  Atividades: ${l.activities_done.trim()}`)
      if (l.homework) out.push(`  Lição de casa: ${l.homework.trim()}`)
      if (l.observations) out.push(`  Observações: ${l.observations.trim()}`)
    }
    const missing = c.lessons.filter(l => !hasReport(l))
    if (missing.length) out.push("", `Aulas sem relatório: ${missing.map(l => shortDay(l.date)).join(", ")}`)
  }

  if (d.highlights.length) {
    out.push("", "", "DESTAQUES DO PERÍODO")
    for (const h of d.highlights) {
      const kind = h.type ? (HIGHLIGHT_LABEL[h.type] ?? h.type) : null
      out.push(`- ${shortDay(h.date)} · ${h.student ?? "Aluno"}${h.class_name ? ` (${h.class_name})` : ""}` +
        `${kind ? ` · ${kind}` : ""}${h.title ? ` — ${h.title}` : ""}`)
    }
  }
  return out.join("\n")
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Troca nomes de alunos e professores por rótulos ("Aluno 3", "Professor(a) 1") antes de mandar
// o texto para uma IA externa. Cobre nomes completos e primeiros nomes que não sejam ambíguos;
// apelidos ou erros de digitação nas observações podem escapar.
export function anonymize(text: string, d: ReportSummary): string {
  const students = new Set<string>()
  d.classes.forEach(c => { c.student_names.forEach(n => students.add(n)); c.low_attendance.forEach(s => students.add(s.name)) })
  d.highlights.forEach(h => h.student && students.add(h.student))
  const teachers = new Set<string>()
  d.classes.forEach(c => { if (c.teacher) teachers.add(c.teacher); c.lessons.forEach(l => l.teacher && teachers.add(l.teacher)) })

  const map = new Map<string, string>()
  const firstCount = new Map<string, number>()
  const all = [...[...students].map(n => [n, "student"] as const), ...[...teachers].map(n => [n, "teacher"] as const)]
  all.forEach(([n]) => { const f = n.trim().split(/\s+/)[0].toLowerCase(); firstCount.set(f, (firstCount.get(f) ?? 0) + 1) })
  let si = 0, ti = 0
  for (const [name, kind] of all) {
    const key = name.trim().toLowerCase()
    if (!key || map.has(key)) continue
    const label = kind === "student" ? `Aluno ${++si}` : `Professor(a) ${++ti}`
    map.set(key, label)
    const first = key.split(/\s+/)[0]
    if (first.length >= 3 && firstCount.get(first) === 1 && !map.has(first)) map.set(first, label)
  }
  // Nomes mais longos primeiro, para "Maria Souza" virar um rótulo só
  const keys = [...map.keys()].sort((a, b) => b.length - a.length)
  for (const k of keys) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(k).replace(/\s+/g, "\\s+")}(?![\\p{L}\\p{N}])`, "giu")
    text = text.replace(re, map.get(k)!)
  }
  return text
}

export const aiInstruction = (anonymized: boolean) => `Você está ajudando a coordenação pedagógica de uma ONG que ensina inglês gratuitamente.
Abaixo estão os dados e os relatórios das aulas de um período. Escreva, em português, um resumo em texto corrido para a coordenação interna, com:
1. Visão geral do período (números principais).
2. O que foi trabalhado nas turmas.
3. Pontos positivos.
4. Pontos de atenção (frequência baixa, turmas sem relatório, dificuldades relatadas).
5. Sugestões de próximos passos.
Use apenas as informações fornecidas; não invente dados.${anonymized ? ' Mantenha os rótulos como "Aluno 1" e "Professor(a) 1" exatamente como estão.' : ""}

--- DADOS ---
`
