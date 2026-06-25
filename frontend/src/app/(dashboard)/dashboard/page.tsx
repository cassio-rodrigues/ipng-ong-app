"use client"

import { useEffect, useState } from "react"
import { statsApi } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  GraduationCap,
  UserCheck,
  Users,
  UserX,
  BookOpen,
  AlertTriangle,
} from "lucide-react"

interface ClassCount { class_id: string; class_name: string; count: number }
interface Stats {
  students: { total: number; active: number; inactive: number; by_gender: { M: number; F: number; O: number; unknown: number } }
  teachers: { total: number; active: number; inactive: number }
  classes: { total: number; active: number }
  students_per_class: ClassCount[]
  absences_per_class: ClassCount[]
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: number | string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`size-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    statsApi.dashboard()
      .then(r => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <p className="text-muted-foreground text-sm">Carregando métricas…</p>
    </div>
  )

  if (error || !data) return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <p className="text-sm text-destructive">Erro ao carregar métricas.</p>
    </div>
  )

  const { students, teachers, classes, students_per_class, absences_per_class } = data
  const genderLabel = (g: string, n: number) => n > 0 ? `${n} ${g}` : null
  const genderSub = [
    genderLabel("M", students.by_gender.M),
    genderLabel("F", students.by_gender.F),
    genderLabel("Outro", students.by_gender.O),
    students.by_gender.unknown > 0 ? `${students.by_gender.unknown} s/info` : null,
  ].filter(Boolean).join(" · ")

  const maxSpc = Math.max(...students_per_class.map(r => r.count), 1)
  const maxAbs = Math.max(...absences_per_class.map(r => r.count), 1)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Alunos */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Alunos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total de alunos" value={students.total} sub={genderSub || undefined} icon={UserCheck} color="text-purple-500" />
          <StatCard label="Ativos" value={students.active} sub={`${students.total > 0 ? Math.round(students.active / students.total * 100) : 0}% do total`} icon={UserCheck} color="text-green-500" />
          <StatCard label="Inativos" value={students.inactive} icon={UserX} color="text-red-400" />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Por gênero</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {[
                { key: "M", label: "Masculino", color: "bg-blue-500" },
                { key: "F", label: "Feminino", color: "bg-pink-500" },
                { key: "O", label: "Outro", color: "bg-yellow-500" },
              ].map(({ key, label, color }) => {
                const n = students.by_gender[key as keyof typeof students.by_gender]
                const pct = students.total > 0 ? Math.round(n / students.total * 100) : 0
                return (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <div className="flex-1">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{n}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Professores e Turmas */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Professores e Turmas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total de professores" value={teachers.total} icon={Users} color="text-blue-500" />
          <StatCard label="Professores ativos" value={teachers.active} sub={teachers.inactive > 0 ? `${teachers.inactive} inativos` : "todos ativos"} icon={Users} color="text-green-500" />
          <StatCard label="Total de turmas" value={classes.total} icon={GraduationCap} color="text-orange-500" />
          <StatCard label="Turmas ativas" value={classes.active} sub={`${classes.total - classes.active} inativas`} icon={GraduationCap} color="text-green-500" />
        </div>
      </section>

      {/* Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alunos por turma */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-purple-500" />
              <CardTitle className="text-base">Alunos por turma</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {students_per_class.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 pb-6">Nenhum dado disponível</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Turma</TableHead><TableHead className="w-20 text-right">Alunos</TableHead><TableHead className="w-32" /></TableRow>
                </TableHeader>
                <TableBody>
                  {students_per_class.map(r => (
                    <TableRow key={r.class_id}>
                      <TableCell className="font-medium">{r.class_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                      <TableCell>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.round(r.count / maxSpc * 100)}%` }} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Faltas por turma */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-orange-500" />
              <CardTitle className="text-base">Faltas por turma</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {absences_per_class.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 pb-6">Nenhuma falta registrada</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Turma</TableHead><TableHead className="w-20 text-right">Faltas</TableHead><TableHead className="w-32" /></TableRow>
                </TableHeader>
                <TableBody>
                  {absences_per_class.map(r => (
                    <TableRow key={r.class_id}>
                      <TableCell className="font-medium">{r.class_name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Badge variant={r.count > 10 ? "destructive" : "secondary"}>{r.count}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.round(r.count / maxAbs * 100)}%` }} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
