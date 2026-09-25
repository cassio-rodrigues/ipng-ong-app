// Faixas de cor da média (documento de recomendações, REC-A4): verde ≥ 8, amarelo 6–8, vermelho < 6.
// A pendência de "nota baixa" é outra regra: nota abaixo do mínimo de cada avaliação (padrão 4).
export type GradeLevel = "critical" | "warning" | "ok" | "none"

export function gradeLevel(value: number | string | null | undefined): GradeLevel {
  if (value === null || value === undefined || value === "" || value === "—") return "none"
  const n = Number(value)
  if (Number.isNaN(n)) return "none"
  if (n < 6) return "critical"
  if (n < 8) return "warning"
  return "ok"
}

export const GRADE_TEXT: Record<GradeLevel, string> = {
  critical: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  ok: "text-green-600 dark:text-green-400",
  none: "text-muted-foreground",
}

export const GRADE_PILL: Record<GradeLevel, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 font-bold",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-semibold",
  ok: "text-green-700 dark:text-green-400",
  none: "text-muted-foreground",
}
