"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { assessmentsApi, classesApi } from "@/lib/api"
import type { Assessment, Student, StudentGrade } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Save, Download, Upload } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { exportToExcel, parseExcel } from "@/lib/excel"
import { toast } from "sonner"

interface GradeRow { student_id: string; student_name: string; score: string; feedback: string }

export default function AssessmentGradesPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { canEdit } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [rows, setRows] = useState<GradeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data: a } = await assessmentsApi.get(id)
        setAssessment(a)
        if (a.class_id) {
          const { data: students } = await classesApi.getStudents(a.class_id)
          const gradeMap = Object.fromEntries((a.grades ?? []).map((g: StudentGrade) => [g.student_id, g]))
          setRows(students.map((s: Student) => ({
            student_id: s.id,
            student_name: s.full_name ?? "—",
            score: gradeMap[s.id]?.score !== undefined ? String(gradeMap[s.id].score) : "",
            feedback: gradeMap[s.id]?.feedback ?? "",
          })))
        }
      } finally { setLoading(false) }
    }
    load()
  }, [id])

  async function saveGrades() {
    setSaving(true)
    try {
      const grades = rows.filter(r => r.score !== "").map(r => ({ student_id: r.student_id, score: Number(r.score), feedback: r.feedback || undefined }))
      await assessmentsApi.postGrades(id, grades)
    } finally { setSaving(false) }
  }

  const update = (i: number, k: "score" | "feedback", v: string) =>
    setRows(rs => rs.map((r, j) => j === i ? { ...r, [k]: v } : r))

  function handleExport() {
    exportToExcel(rows.map(r => ({
      "Aluno": r.student_name,
      "Nota": r.score,
      "Feedback": r.feedback,
    })), `notas_${assessment?.title ?? id}`)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const imported = await parseExcel(file)
    const nameMap = Object.fromEntries(rows.map(r => [r.student_name.toLowerCase(), r.student_id]))
    let found = 0
    setRows(prev => {
      const updated = [...prev]
      for (const row of imported) {
        const sid = nameMap[String(row["Aluno"] ?? "").toLowerCase()]
        if (!sid) continue
        const idx = updated.findIndex(r => r.student_id === sid)
        if (idx === -1) continue
        updated[idx] = { ...updated[idx], score: String(row["Nota"] ?? ""), feedback: String(row["Feedback"] ?? "") }
        found++
      }
      return updated
    })
    toast.success(`${found} nota(s) preenchida(s) — clique "Salvar notas" para confirmar`)
    e.target.value = ""
  }

  if (loading) return <p className="text-muted-foreground text-sm p-6">Carregando…</p>
  if (!assessment) return <p className="text-muted-foreground text-sm p-6">Avaliação não encontrada.</p>

  const filled = rows.filter(r => r.score !== "").length
  const avg = filled > 0 ? (rows.filter(r => r.score !== "").reduce((s, r) => s + Number(r.score), 0) / filled).toFixed(1) : "—"

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="size-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold">{assessment.title}</h1>
          <p className="text-sm text-muted-foreground">
            {assessment.type ?? "—"} · Semestre {assessment.semester ?? "—"} · Nota máx. {assessment.max_score ?? "—"}
            {filled > 0 && <> · <span className="text-foreground">Média: {avg}</span></>}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}><Download className="size-4 mr-2" />Exportar notas</Button>
        {canEdit && <>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={rows.length === 0}><Upload className="size-4 mr-2" />Importar notas</Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
        </>}
      </div>

      <div className="rounded-md border bg-card mb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead className="w-32">Nota</TableHead>
              <TableHead>Feedback</TableHead>
              <TableHead className="w-20 text-right">Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => {
              const score = r.score !== "" ? Number(r.score) : null
              const max = assessment.max_score ?? 10
              const passed = score !== null && score >= max * 0.6
              return (
                <TableRow key={r.student_id}>
                  <TableCell className="font-medium">{r.student_name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={assessment.max_score ?? undefined}
                      step="0.1"
                      className="h-7 text-xs w-24"
                      value={r.score}
                      onChange={e => update(i, "score", e.target.value)}
                      placeholder="—"
                      disabled={!canEdit}
                    />
                  </TableCell>
                  <TableCell>
                    <Input className="h-7 text-xs" value={r.feedback} onChange={e => update(i, "feedback", e.target.value)} placeholder="Comentário" disabled={!canEdit} />
                  </TableCell>
                  <TableCell className="text-right">
                    {score !== null
                      ? <Badge variant={passed ? "default" : "destructive"}>{passed ? "Aprovado" : "Reprovado"}</Badge>
                      : <span className="text-muted-foreground text-xs">Pendente</span>}
                  </TableCell>
                </TableRow>
              )
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhum aluno matriculado nesta turma</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      {rows.length > 0 && canEdit && (
        <Button onClick={saveGrades} disabled={saving}>
          <Save className="size-4 mr-2" />{saving ? "Salvando…" : "Salvar notas"}
        </Button>
      )}
    </div>
  )
}
