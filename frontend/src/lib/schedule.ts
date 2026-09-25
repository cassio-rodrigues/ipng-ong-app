import type { Class_ } from "@/types"

// Mesma convenção do backend (date.weekday()): 0 = segunda … 6 = domingo
export const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
const WEEKDAYS_PLURAL = ["Segundas", "Terças", "Quartas", "Quintas", "Sextas", "Sábados", "Domingos"]

/** "09:00:00" → "9h", "09:30:00" → "9h30" */
export function fmtHour(t: string | null | undefined) {
  if (!t) return ""
  const [h, m] = t.split(":").map(Number)
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`
}

/** "Sábados, 9h–11h" (ou null se a turma não tem horário fixo) */
export function formatSchedule(c: Pick<Class_, "schedule_weekday" | "schedule_start" | "schedule_end">) {
  if (c.schedule_weekday === null || c.schedule_weekday === undefined || !c.schedule_start) return null
  const end = c.schedule_end ? `–${fmtHour(c.schedule_end)}` : ""
  return `${WEEKDAYS_PLURAL[c.schedule_weekday]}, ${fmtHour(c.schedule_start)}${end}`
}

/** JS getDay() (0 = domingo) → convenção do backend (0 = segunda) */
export function weekdayOf(d: Date) {
  return (d.getDay() + 6) % 7
}

export function generateResultMessage(r: { created: number; existing: number; skipped_holidays: string[]; until: string }) {
  const until = new Date(r.until + "T12:00:00").toLocaleDateString("pt-BR")
  const parts = [`${r.created} ${r.created === 1 ? "aula gerada" : "aulas geradas"} até ${until}`]
  if (r.skipped_holidays.length) parts.push(`${r.skipped_holidays.length} ${r.skipped_holidays.length === 1 ? "feriado pulado" : "feriados pulados"}`)
  if (r.existing) parts.push(`${r.existing} já existiam`)
  return parts.join(" · ")
}

// ── Planilha ───────────────────────────────────────────────────────────────
const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
const WEEKDAY_KEYS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]

/** "Sábado", "sabado", "Sáb", "sábados", "sab." → 5. Vazio → null. Não reconhecido → undefined. */
export function parseWeekday(text: string | undefined): number | null | undefined {
  const t = strip(String(text ?? "")).replace(/\./g, "")
  if (!t) return null
  const i = WEEKDAY_KEYS.findIndex(k => t.startsWith(k))
  return i >= 0 ? i : undefined
}

/** "9:00", "09:00", "9h", "9h30", "9:00 AM", "21:15:00" → "HH:MM". Vazio → null. Inválido → undefined. */
export function parseTime(text: string | undefined): string | null | undefined {
  const t = strip(String(text ?? "")).replace(/\s+/g, "")
  if (!t) return null
  const m = t.match(/^(\d{1,2})(?:[:h](\d{2})?)?(?::\d{2})?(am|pm)?$/)
  if (!m) return undefined
  let h = Number(m[1])
  const min = Number(m[2] ?? 0)
  if (m[3] === "pm" && h < 12) h += 12
  if (m[3] === "am" && h === 12) h = 0
  if (h > 23 || min > 59) return undefined
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
}
