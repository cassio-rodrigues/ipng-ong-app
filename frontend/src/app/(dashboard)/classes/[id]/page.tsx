"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { classesApi, unitsApi, usersApi } from "@/lib/api"
import type { Class_, ClassSummary, Unit, User } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Trash2, UserPlus, Users, UserCheck, BarChart3 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

const STATUS_LABEL: Record<string, string> = { active: "Ativa", inactive: "Inativa", completed: "Concluída" }
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "secondary",
  completed: "outline",
}

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { canEdit } = useAuth()

  const [cls, setCls] = useState<Class_ | null>(null)
  const [summary, setSummary] = useState<ClassSummary | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [addTeacherId, setAddTeacherId] = useState("")
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const [cRes, sRes, uRes, tRes] = await Promise.all([
        classesApi.get(id),
        classesApi.getSummary(id),
        unitsApi.list(),
        usersApi.list({ limit: 200 }),
      ])
      setCls(cRes.data)
      setSummary(sRes.data)
      setUnits(uRes.data)
      setTeachers((tRes.data as User[]).filter(u => u.role === "teacher" || u.role === "coordinator"))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  async function handleAddTeacher(e: React.FormEvent) {
    e.preventDefault(); if (!addTeacherId) return; setSaving(true)
    try { await classesApi.addAssignment(id, { teacher_id: addTeacherId }); setAddTeacherId(""); await load() }
    finally { setSaving(false) }
  }

  async function handleRemoveTeacher(assignmentId: string) {
    if (!confirm("Remover este professor da turma?")) return
    await classesApi.removeAssignment(id, assignmentId)
    await load()
  }

  if (loading) return <p className="text-muted-foreground text-sm p-6">Carregando…</p>
  if (!cls) return <p className="text-muted-foreground text-sm p-6">Turma não encontrada.</p>

  const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t.name]))
  const unitName = units.find(u => u.id === cls.unit_id)?.name ?? "—"
  const assignedIds = new Set(cls.assignments.map(a => a.teacher_id))
  const availableTeachers = teachers.filter(t => t.id !== cls.main_teacher_id && !assignedIds.has(t.id))
  const sortedStudents = (summary?.students ?? [])
    .slice()
    .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "", "pt-BR"))

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="size-4" /></Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{cls.name ?? "—"}</h1>
            <Badge variant={STATUS_VARIANT[cls.status ?? "active"] ?? "secondary"}>{STATUS_LABEL[cls.status ?? "active"] ?? cls.status}</Badge>
            {cls.level && <Badge variant="outline">{cls.level}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{unitName}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alunos matriculados</CardTitle>
            <Users className="size-5 text-purple-500" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{summary?.student_count ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Frequência da turma</CardTitle>
            <UserCheck className="size-5 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{summary?.attendance_rate ?? 0}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Média geral</CardTitle>
            <BarChart3 className="size-5 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{summary?.grade_average ?? "—"}</div></CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader className="pb-3"><CardTitle className="text-base">Professores</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {cls.main_teacher_id && (
              <Badge variant="default" className="gap-1.5">
                {teacherMap[cls.main_teacher_id] ?? "—"} <span className="opacity-75">· Principal</span>
              </Badge>
            )}
            {cls.assignments.map(a => (
              <Badge key={a.id} variant="secondary" className="gap-1.5 pr-1">
                {teacherMap[a.teacher_id] ?? "—"}
                {canEdit && (
                  <button type="button" onClick={() => handleRemoveTeacher(a.id)} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5" title="Remover professor">
                    <Trash2 className="size-3" />
                  </button>
                )}
              </Badge>
            ))}
            {!cls.main_teacher_id && cls.assignments.length === 0 && (
              <span className="text-sm text-muted-foreground">Nenhum professor atribuído</span>
            )}
          </div>
          {canEdit && (
            <form onSubmit={handleAddTeacher} className="flex gap-2 pt-1">
              <Select value={addTeacherId} onValueChange={setAddTeacherId}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Adicionar professor" /></SelectTrigger>
                <SelectContent>{availableTeachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
              <Button type="submit" size="sm" disabled={saving || !addTeacherId}><UserPlus className="size-4 mr-2" />Adicionar</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Alunos da turma</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead className="w-32 text-right">Frequência</TableHead><TableHead className="w-32 text-right">Média</TableHead></TableRow></TableHeader>
            <TableBody>
              {sortedStudents.map(s => (
                <TableRow key={s.student_id}>
                  <TableCell className="font-medium">{s.full_name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.attendance_rate}%</TableCell>
                  <TableCell className="text-right tabular-nums">{s.grade_average ?? "—"}</TableCell>
                </TableRow>
              ))}
              {sortedStudents.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum aluno matriculado nesta turma</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
