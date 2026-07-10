"use client"

import { useEffect, useState } from "react"
import { statsApi, classesApi } from "@/lib/api"
import type { Class_ } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Cake, GraduationCap, Users } from "lucide-react"

interface BirthdayPerson {
  id: string
  name: string
  type: "student" | "teacher"
  birth_date: string
  day: number
  gender: string | null
  classes: string[]
  unit: string | null
  role: string | null
}

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
]

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin", coordinator: "Coordenador", teacher: "Professor",
}

function age(birthDate: string): number {
  const [y, m, d] = birthDate.split("-").map(Number)
  const today = new Date()
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--
  return age
}

function fmtDay(birthDate: string, month: number): string {
  const [, , d] = birthDate.split("-").map(Number)
  return `${String(d).padStart(2, "0")}/${String(month).padStart(2, "0")}`
}

export default function AniversariantesPage() {
  const currentMonth = new Date().getMonth() + 1
  const [month, setMonth] = useState(currentMonth)
  const [filterType, setFilterType] = useState<"all" | "student" | "teacher">("all")
  const [filterClass, setFilterClass] = useState("all")
  const [people, setPeople] = useState<BirthdayPerson[]>([])
  const [classes, setClasses] = useState<Class_[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    classesApi.list().then(r => setClasses(r.data))
  }, [])

  useEffect(() => {
    setLoading(true)
    statsApi.birthdays(month)
      .then(r => setPeople(r.data))
      .finally(() => setLoading(false))
  }, [month])

  const visible = people.filter(p => {
    if (filterType !== "all" && p.type !== filterType) return false
    if (filterClass !== "all" && p.type === "student") {
      if (!p.classes.some(c => {
        const cls = classes.find(cl => cl.name === c)
        return cls?.id === filterClass
      })) return false
    }
    return true
  })

  const todayDay = new Date().getDate()
  const todayMonth = new Date().getMonth() + 1

  const studentCount = visible.filter(p => p.type === "student").length
  const teacherCount = visible.filter(p => p.type === "teacher").length

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-pink-500 rounded-xl p-2.5 text-white shadow-sm">
          <Cake className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Aniversariantes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {visible.length} aniversariante{visible.length !== 1 ? "s" : ""} em {MONTHS[month - 1]}
            {studentCount > 0 && <span className="ml-2">· {studentCount} aluno{studentCount !== 1 ? "s" : ""}</span>}
            {teacherCount > 0 && <span className="ml-1">· {teacherCount} professor{teacherCount !== 1 ? "es" : ""}</span>}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={v => setFilterType(v as typeof filterType)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="student">Apenas alunos</SelectItem>
            <SelectItem value="teacher">Apenas professores</SelectItem>
          </SelectContent>
        </Select>

        {filterType !== "teacher" && (
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por turma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Cake className="size-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">Nenhum aniversariante encontrado para {MONTHS[month - 1]}.</p>
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Dia</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Turmas / Perfil</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Gênero</TableHead>
                <TableHead className="w-16">Idade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(p => {
                const isToday = p.day === todayDay && month === todayMonth
                return (
                  <TableRow key={`${p.type}-${p.id}`} className={isToday ? "bg-pink-50 dark:bg-pink-950/20" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold tabular-nums text-base">{String(p.day).padStart(2, "0")}</span>
                        {isToday && <Cake className="size-3.5 text-pink-500" />}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.type === "student" ? (
                        <Badge variant="secondary" className="gap-1">
                          <GraduationCap className="size-3" />Aluno
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Users className="size-3" />Professor
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.type === "student" ? (
                        p.classes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.classes.map(c => (
                              <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                            ))}
                          </div>
                        ) : <span className="text-muted-foreground text-xs">Sem turma</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">{ROLE_LABEL[p.role ?? ""] ?? p.role ?? "—"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.unit ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.gender === "M" ? "Masc." : p.gender === "F" ? "Fem." : p.gender ? "Outro" : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm font-medium">
                      {age(p.birth_date)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
