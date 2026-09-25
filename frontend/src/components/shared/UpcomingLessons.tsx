"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarClock, CheckCircle2, Clock, CalendarX2 } from "lucide-react"
import { lessonsApi, calendarApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { eventsOnDay, localDay } from "@/lib/calendar"
import type { CalendarEvent, UpcomingLesson } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Aulas de hoje em diante nas turmas visíveis ao usuário (o backend aplica o escopo por perfil)
export function useUpcomingLessons(days = 7) {
  const [lessons, setLessons] = useState<UpcomingLesson[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      lessonsApi.upcoming(days),
      calendarApi.list({ start_date: `${localDay(new Date())}T00:00:00`, limit: 500 }),
    ])
      .then(([l, e]) => { setLessons(l.data); setEvents(e.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [days])

  const today = localDay(new Date())
  const todayLessons = lessons.filter(l => localDay(l.scheduled_at) === today)
  // Chamada pendente: aula de hoje que já começou e ainda não tem presença registrada
  const pendingAttendance = todayLessons.filter(l => l.attendance_count === 0 && new Date(l.scheduled_at) <= new Date())

  return { lessons, events, loading, todayLessons, pendingAttendance }
}

function dayLabel(day: string) {
  const today = localDay(new Date())
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  if (day === today) return "Hoje"
  if (day === localDay(tomorrow)) return "Amanhã"
  const [y, m, d] = day.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })
}

export function UpcomingLessonsCard({
  lessons, events, loading, max = 8, title = "Próximas aulas",
}: { lessons: UpcomingLesson[]; events: CalendarEvent[]; loading: boolean; max?: number; title?: string }) {
  const shown = lessons.slice(0, max)
  const groups = shown.reduce<Record<string, UpcomingLesson[]>>((acc, l) => {
    const day = localDay(l.scheduled_at)
    ;(acc[day] ??= []).push(l)
    return acc
  }, {})
  const now = new Date()
  const today = localDay(now)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-blue-500" />
          <CardTitle className="text-base">{title}</CardTitle>
          <Link href="/lessons" className="ml-auto text-xs text-muted-foreground hover:underline">Ver todas</Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!loading && lessons.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma aula nos próximos dias.</p>}
        {Object.entries(groups).map(([day, items]) => (
          <div key={day}>
            <p className={cn("text-xs font-semibold uppercase tracking-wide mb-1.5", day === today ? "text-primary" : "text-muted-foreground")}>{dayLabel(day)}</p>
            <ul className="space-y-1">
              {items.map(l => {
                const holiday = eventsOnDay(events, day, l.unit_id).find(e => e.event_type === "holiday")
                const started = new Date(l.scheduled_at) <= now
                const isToday = day === today
                return (
                  <li key={l.id}>
                    <Link href={`/lessons/${l.id}?tab=attendance`} className="flex items-center gap-3 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted text-sm">
                      <span className="w-12 shrink-0 tabular-nums font-medium">
                        {new Date(l.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="flex-1 min-w-0 truncate">{l.class_name ?? "—"}</span>
                      {holiday && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-500/20 dark:text-violet-300" title={holiday.title ?? ""}>
                          <CalendarX2 className="size-3" />Feriado
                        </span>
                      )}
                      {isToday && l.attendance_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><CheckCircle2 className="size-3.5" />Chamada feita</span>
                      )}
                      {isToday && l.attendance_count === 0 && (
                        <span className={cn("inline-flex items-center gap-1 text-xs", started ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                          <Clock className="size-3.5" />{started ? "Chamada pendente" : "A fazer"}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {lessons.length > max && <p className="text-xs text-muted-foreground">+ {lessons.length - max} aulas nos próximos dias</p>}
      </CardContent>
    </Card>
  )
}
