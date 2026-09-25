import type { CalendarEvent } from "@/types"

// O calendário grava a data/hora local "como se fosse UTC" (ver calendar/page.tsx),
// então o dia do evento é a parte de data do ISO, sem conversão de fuso.
function eventDays(ev: CalendarEvent): [string, string] | null {
  if (!ev.start_date) return null
  return [ev.start_date.slice(0, 10), (ev.end_date ?? ev.start_date).slice(0, 10)]
}

// Dia local (YYYY-MM-DD) de um instante real, como o scheduled_at das aulas
export function localDay(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/** Eventos que cobrem o dia; evento com unidade só vale para aquela unidade. */
export function eventsOnDay(events: CalendarEvent[], day: string, unitId?: string | null): CalendarEvent[] {
  return events.filter(ev => {
    const range = eventDays(ev)
    if (!range) return false
    if (ev.unit_id && unitId !== undefined && ev.unit_id !== unitId) return false
    return range[0] <= day && day <= range[1]
  })
}

export const EVENT_TYPE_LABEL: Record<string, string> = { holiday: "Feriado", institutional: "Institucional", class_event: "Evento de turma" }

/** Janela usada nas telas de turma/aula: 90 dias para trás cobre o histórico recente. */
export function calendarWindowStart() {
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return localDay(d) + "T00:00:00"
}
