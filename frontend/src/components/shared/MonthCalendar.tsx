"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { calendarApi, classesApi, lessonsApi, statsApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { localDay } from "@/lib/calendar"
import type { CalendarEvent, Class_, Lesson } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

// Paleta categórica em ordem fixa, validada (dataviz validate_palette: claro e escuro).
// A cor fica na bolinha ao lado do texto; o texto é sempre em tinta normal.
type Category = "lesson" | "holiday" | "institutional" | "class_event" | "birthday"
const CATEGORIES: { key: Category; label: string; dot: string }[] = [
  { key: "lesson",        label: "Aulas",           dot: "bg-[#2a78d6] dark:bg-[#3987e5]" },
  { key: "holiday",       label: "Feriado",         dot: "bg-[#eb6834] dark:bg-[#d95926]" },
  { key: "institutional", label: "Institucional",   dot: "bg-[#1baf7a] dark:bg-[#199e70]" },
  { key: "class_event",   label: "Evento de turma", dot: "bg-[#eda100] dark:bg-[#c98500]" },
  { key: "birthday",      label: "Aniversário",     dot: "bg-[#e87ba4] dark:bg-[#d55181]" },
]
const DOT = Object.fromEntries(CATEGORIES.map(c => [c.key, c.dot])) as Record<Category, string>

interface Birthday { id: string; name: string; type: "student" | "teacher"; day: number }
interface DayItems { lessons: Lesson[]; events: CalendarEvent[]; birthdays: Birthday[] }

function parseLocalDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Calendário mensal com aulas, eventos do calendário e aniversários.
 * `onlyClassIds`: restringe as aulas (professor vê só as das turmas dele).
 */
export function MonthCalendar({ onlyClassIds }: { onlyClassIds?: string[] }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [classNames, setClassNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate())
  const scopeKey = onlyClassIds?.join(",")

  useEffect(() => {
    classesApi.list({ limit: 500 }).then(r => setClassNames(Object.fromEntries((r.data as Class_[]).map(c => [c.id, c.name ?? "—"])))).catch(() => {})
  }, [])

  useEffect(() => {
    const mm = String(month + 1).padStart(2, "0")
    const lastDay = new Date(year, month + 1, 0).getDate()
    // Aulas: uma folga de 1 dia de cada lado cobre a diferença de fuso; o filtro final é pelo dia local
    const from = localDay(new Date(year, month, 0))
    const to = localDay(new Date(year, month + 1, 1))
    const scope = scopeKey ? new Set(scopeKey.split(",")) : null
    let alive = true
    Promise.all([
      calendarApi.list({ start_date: `${year}-${mm}-01`, end_date: `${year}-${mm}-${lastDay}`, limit: 500 }),
      lessonsApi.list({ start_date: from, end_date: to, limit: 2000 }),
      statsApi.birthdays(month + 1),
    ])
      .then(([e, l, b]) => {
        if (!alive) return
        setEvents(e.data)
        setLessons((l.data as Lesson[]).filter(x => x.status !== "cancelled" && (!scope || (x.class_id && scope.has(x.class_id)))))
        setBirthdays(b.data)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [year, month, scopeKey])

  const prevMonth = () => { setSelectedDay(null); if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { setSelectedDay(null); if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDayOfWeek).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const byDay: Record<number, DayItems> = {}
  const slot = (d: number) => (byDay[d] ??= { lessons: [], events: [], birthdays: [] })
  for (const ev of events) {
    if (!ev.start_date) continue
    const cursor = parseLocalDate(ev.start_date)
    const end = ev.end_date ? parseLocalDate(ev.end_date) : new Date(cursor)
    while (cursor <= end) {
      if (cursor.getFullYear() === year && cursor.getMonth() === month) slot(cursor.getDate()).events.push(ev)
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  for (const l of lessons) {
    if (!l.scheduled_at) continue
    const d = new Date(l.scheduled_at)
    if (d.getFullYear() === year && d.getMonth() === month) slot(d.getDate()).lessons.push(l)
  }
  for (const b of birthdays) slot(b.day).birthdays.push(b)
  for (const items of Object.values(byDay)) items.lessons.sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!))

  const isToday = (day: number) => day === now.getDate() && month === now.getMonth() && year === now.getFullYear()
  const sel = selectedDay ? byDay[selectedDay] : undefined
  const time = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""
  const eventCat = (ev: CalendarEvent): Category => (ev.event_type === "holiday" || ev.event_type === "class_event" ? ev.event_type : "institutional")

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-sky-500" />
            <CardTitle className="text-base">{MONTH_NAMES[month]} {year}</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth} aria-label="Mês anterior"><ChevronLeft className="size-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth} aria-label="Próximo mês"><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground mb-1">
          {DAY_NAMES.map(d => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className={cn("grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden", loading && "opacity-50")}>
          {cells.map((day, i) => {
            const it = day ? byDay[day] : undefined
            const lines: { cat: Category; text: string; title: string }[] = []
            if (it) {
              for (const ev of it.events) lines.push({ cat: eventCat(ev), text: ev.title ?? "Evento", title: ev.title ?? "" })
              if (it.lessons.length) lines.push({
                cat: "lesson",
                text: it.lessons.length === 1 ? (classNames[it.lessons[0].class_id ?? ""] ?? "1 aula") : `${it.lessons.length} aulas`,
                title: it.lessons.map(l => `${time(l.scheduled_at)} ${classNames[l.class_id ?? ""] ?? ""}`).join("\n"),
              })
              if (it.birthdays.length) lines.push({
                cat: "birthday",
                text: it.birthdays.length === 1 ? it.birthdays[0].name.split(" ")[0] : `${it.birthdays.length} aniversários`,
                title: it.birthdays.map(b => b.name).join("\n"),
              })
            }
            return (
              <button
                key={i} type="button" disabled={!day} onClick={() => day && setSelectedDay(day)}
                aria-pressed={day !== null && selectedDay === day}
                className={cn(
                  "min-h-16 p-1 text-xs bg-card text-left align-top disabled:cursor-default",
                  !day && "bg-muted/30",
                  day && "hover:bg-muted/50",
                  day && selectedDay === day && "ring-2 ring-inset ring-primary",
                )}
              >
                {day && (
                  <>
                    <div className={cn("w-6 h-6 flex items-center justify-center rounded-full font-medium mb-1 text-xs", isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground")}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {lines.slice(0, 3).map((ln, j) => (
                        <div key={j} title={ln.title} className="flex items-center gap-1 leading-tight text-[10px] text-foreground">
                          <span className={cn("size-2 shrink-0 rounded-full", DOT[ln.cat])} aria-hidden />
                          <span className="truncate">{ln.text}</span>
                        </div>
                      ))}
                      {lines.length > 3 && <div className="text-[10px] text-muted-foreground pl-3">+{lines.length - 3}</div>}
                    </div>
                  </>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex gap-4 mt-3 text-[11px] text-muted-foreground flex-wrap" aria-label="Legenda">
          {CATEGORIES.map(c => (
            <span key={c.key} className="flex items-center gap-1.5"><span className={cn("size-2.5 rounded-full shrink-0", c.dot)} />{c.label}</span>
          ))}
        </div>

        {/* Detalhe do dia: também é a visão em lista (acessível) do calendário */}
        {selectedDay && (
          <div className="mt-4 rounded-md border p-3">
            <p className="text-sm font-semibold mb-2">
              {new Date(year, month, selectedDay).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            {!sel && <p className="text-sm text-muted-foreground">Nada neste dia.</p>}
            <ul className="space-y-1.5 text-sm">
              {sel?.events.map(ev => (
                <li key={ev.id} className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full shrink-0", DOT[eventCat(ev)])} aria-hidden />
                  <span>{ev.title}</span>
                  <span className="text-xs text-muted-foreground">{CATEGORIES.find(c => c.key === eventCat(ev))?.label}</span>
                </li>
              ))}
              {sel?.lessons.map(l => (
                <li key={l.id}>
                  <Link href={`/lessons/${l.id}`} className="flex items-center gap-2 hover:underline">
                    <span className={cn("size-2.5 rounded-full shrink-0", DOT.lesson)} aria-hidden />
                    <span className="tabular-nums w-11">{time(l.scheduled_at)}</span>
                    <span>{classNames[l.class_id ?? ""] ?? "Aula"}</span>
                  </Link>
                </li>
              ))}
              {sel?.birthdays.map(b => (
                <li key={`${b.type}-${b.id}`} className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full shrink-0", DOT.birthday)} aria-hidden />
                  <span>🎂 {b.name}</span>
                  <span className="text-xs text-muted-foreground">{b.type === "student" ? "Aluno" : "Equipe"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
