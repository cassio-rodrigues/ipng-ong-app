// Faixas de cor da frequência (documento de recomendações, REC-A4):
// verde > 85%, amarelo 70–85%, vermelho < 70%.
// A pendência de evasão é mais restrita: < 60% ou 3 faltas seguidas (backend, alerts/service.py).
export const ATTENDANCE_CRITICAL = 70
export const ATTENDANCE_WARNING = 85

export type AttendanceLevel = "critical" | "warning" | "ok" | "none"

export function attendanceLevel(rate: number, total = 1): AttendanceLevel {
  if (total === 0) return "none"
  if (rate < ATTENDANCE_CRITICAL) return "critical"
  if (rate < ATTENDANCE_WARNING) return "warning"
  return "ok"
}

export const ATTENDANCE_LEVEL_LABEL: Record<AttendanceLevel, string> = {
  critical: "Frequência crítica",
  warning: "Atenção",
  ok: "Regular",
  none: "Sem registros",
}

// Cor do número em cards/textos grandes
export const ATTENDANCE_TEXT: Record<AttendanceLevel, string> = {
  critical: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  ok: "text-green-600 dark:text-green-400",
  none: "text-muted-foreground",
}

export function formatRate(rate: number) {
  return `${rate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
}

// Faltas em proporção das aulas: verde < 10%, amarelo 10–20%, vermelho > 20%
export function absenceLevel(absent: number, total: number): AttendanceLevel {
  if (total === 0) return "none"
  const pct = absent / total * 100
  if (pct > 20) return "critical"
  if (pct >= 10) return "warning"
  return "ok"
}
