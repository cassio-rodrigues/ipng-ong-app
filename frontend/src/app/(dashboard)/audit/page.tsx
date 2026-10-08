"use client"

import { Fragment, useEffect, useState } from "react"
import { auditApi, usersApi } from "@/lib/api"
import type { User } from "@/types"
import { Input } from "@/components/ui/input"
import { exportToExcel } from "@/lib/excel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronRight, Download, RefreshCw } from "lucide-react"

interface AuditLog {
  id: string
  user_id: string | null
  user_name: string | null
  action: string | null
  entity_type: string | null
  entity_id: string | null
  label: string | null
  details: { values?: Record<string, unknown>; changes?: Record<string, [unknown, unknown]> } | null
  created_at: string | null
}

const PAGE_SIZE = 100
const EXPORT_LIMIT = 50_000

const ACTION_LABEL: Record<string, string> = { create: "Criou", update: "Editou", delete: "Excluiu" }
const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = { create: "default", update: "secondary", delete: "destructive" }

const ENTITY_LABEL: Record<string, string> = {
  users: "Usuário", teacher_profile: "Perfil de professor", units: "Unidade",
  books: "Livro", book_chapters: "Capítulo", book_loans: "Empréstimo de livro",
  classes: "Turma", class_assignments: "Professor da turma",
  students: "Aluno", enrollments: "Matrícula", student_followups: "Acompanhamento",
  lessons: "Aula", lesson_reports: "Relatório de aula", lesson_materials: "Material de aula",
  attendance: "Presença", calendar_events: "Evento do calendário",
  assessments: "Avaliação", student_grades: "Nota",
  activities: "Atividade", student_activities: "Atividade do aluno", student_highlights: "Destaque",
}

const FIELD_LABEL: Record<string, string> = {
  name: "Nome", full_name: "Nome", email: "Email", phone: "WhatsApp", telefone: "Telefone",
  status: "Status", role: "Perfil", atribuicoes: "Perfis adicionais", password_hash: "Senha",
  notes: "Observação", homework_status: "Dever", unit_id: "Unidade", class_id: "Turma",
  student_id: "Aluno", lesson_id: "Aula", birth_date: "Nascimento", gender: "Gênero",
  address: "Endereço", scheduled_at: "Data da aula", score: "Nota", title: "Título",
}

// Campos técnicos que só poluem o detalhe de criação/exclusão
const HIDDEN_FIELDS = new Set(["id", "created_at"])

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—"
  if (typeof v === "boolean") return v ? "Sim" : "Não"
  if (Array.isArray(v)) return v.join(", ") || "—"
  return String(v)
}

function detailsText(details: AuditLog["details"]): string {
  if (details?.changes) {
    return Object.entries(details.changes).map(([k, [from, to]]) => `${FIELD_LABEL[k] ?? k}: ${fmt(from)} → ${fmt(to)}`).join("; ")
  }
  return Object.entries(details?.values ?? {})
    .filter(([k]) => !HIDDEN_FIELDS.has(k))
    .map(([k, v]) => `${FIELD_LABEL[k] ?? k}: ${fmt(v)}`).join("; ")
}

function DetailsView({ details }: { details: AuditLog["details"] }) {
  if (details?.changes) {
    return (
      <ul className="space-y-0.5">
        {Object.entries(details.changes).map(([k, [from, to]]) => (
          <li key={k}>
            <span className="text-muted-foreground">{FIELD_LABEL[k] ?? k}:</span>{" "}
            <span className="line-through opacity-60">{fmt(from)}</span> → <span className="font-medium">{fmt(to)}</span>
          </li>
        ))}
      </ul>
    )
  }
  const values = Object.entries(details?.values ?? {}).filter(([k]) => !HIDDEN_FIELDS.has(k))
  if (!values.length) return <span className="text-muted-foreground">Sem detalhes</span>
  return (
    <ul className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
      {values.map(([k, v]) => (
        <li key={k} className="break-all"><span className="text-muted-foreground">{FIELD_LABEL[k] ?? k}:</span> {fmt(v)}</li>
      ))}
    </ul>
  )
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [filterAction, setFilterAction] = useState("all")
  const [filterEntity, setFilterEntity] = useState("all")
  const [filterUser, setFilterUser] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [exporting, setExporting] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function params(skip: number, limit = PAGE_SIZE) {
    return {
      skip, limit,
      action: filterAction !== "all" ? filterAction : undefined,
      entity_type: filterEntity !== "all" ? filterEntity : undefined,
      user_id: filterUser !== "all" ? filterUser : undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }
  }

  // Quem dispara a recarga liga o "Carregando…" (setState síncrono dentro do effect é proibido)
  async function load() {
    try {
      const { data } = await auditApi.list(params(0))
      setLogs(data); setHasMore(data.length === PAGE_SIZE)
    } finally { setLoading(false) }
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const { data } = await auditApi.list(params(logs.length))
      setLogs(l => [...l, ...data]); setHasMore(data.length === PAGE_SIZE)
    } finally { setLoadingMore(false) }
  }

  useEffect(() => { load() }, [filterAction, filterEntity, filterUser, startDate, endDate])
  useEffect(() => { usersApi.list({ limit: 500 }).then(r => setUsers(r.data)).catch(() => {}) }, [])

  // Recarregar liga o "Carregando…" antes de mudar o filtro (setState síncrono no effect é proibido)
  function changeFilter(set: (v: string) => void) {
    return (v: string) => { setLoading(true); set(v) }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const { data } = await auditApi.list(params(0, EXPORT_LIMIT))
      exportToExcel((data as AuditLog[]).map(l => ({
        "Data/Hora": l.created_at ? new Date(l.created_at).toLocaleString("pt-BR") : "",
        "Usuário": l.user_name ?? "",
        "Ação": l.action ? ACTION_LABEL[l.action] ?? l.action : "",
        "Tipo": l.entity_type ? ENTITY_LABEL[l.entity_type] ?? l.entity_type : "",
        "Registro": l.label ?? "",
        "ID do registro": l.entity_id ?? "",
        "Detalhes": detailsText(l.details),
      })), `auditoria_${new Date().toISOString().slice(0, 10)}`)
    } finally { setExporting(false) }
  }

  function toggle(id: string) {
    setExpanded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Logs de Auditoria</h1>
          <p className="text-sm text-muted-foreground mt-1">Quem criou, editou ou excluiu cada registro do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            <Download className="size-4 mr-2" />{exporting ? "Exportando…" : "Exportar"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); load() }} disabled={loading}>
            <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />Atualizar
          </Button>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Select value={filterAction} onValueChange={changeFilter(setFilterAction)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            <SelectItem value="create">Criações</SelectItem>
            <SelectItem value="update">Edições</SelectItem>
            <SelectItem value="delete">Exclusões</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEntity} onValueChange={changeFilter(setFilterEntity)}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(ENTITY_LABEL)
              .sort(([, a], [, b]) => a.localeCompare(b, "pt-BR"))
              .map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterUser} onValueChange={changeFilter(setFilterUser)}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os usuários</SelectItem>
            {users
              .slice().sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt-BR"))
              .map(u => <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>De</span>
          <Input type="date" className="w-40" value={startDate} onChange={e => changeFilter(setStartDate)(e.target.value)} />
          <span>até</span>
          <Input type="date" className="w-40" value={endDate} onChange={e => changeFilter(setEndDate)(e.target.value)} />
        </div>
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Carregando…</p> : (
        <>
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead className="w-8" /><TableHead>Data/Hora</TableHead><TableHead>Usuário</TableHead><TableHead>Ação</TableHead><TableHead>Tipo</TableHead><TableHead>Registro</TableHead></TableRow></TableHeader>
              <TableBody>
                {logs.map(l => {
                  const open = expanded.has(l.id)
                  return (
                    <Fragment key={l.id}>
                      <TableRow className="cursor-pointer" onClick={() => toggle(l.id)}>
                        <TableCell className="text-muted-foreground">{open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.created_at ? new Date(l.created_at).toLocaleString("pt-BR") : "—"}</TableCell>
                        <TableCell>{l.user_name ?? "—"}</TableCell>
                        <TableCell>{l.action ? <Badge variant={ACTION_VARIANT[l.action] ?? "outline"}>{ACTION_LABEL[l.action] ?? l.action}</Badge> : "—"}</TableCell>
                        <TableCell>{l.entity_type ? ENTITY_LABEL[l.entity_type] ?? l.entity_type : "—"}</TableCell>
                        <TableCell>{l.label ?? <span className="font-mono text-xs text-muted-foreground">{l.entity_id ? l.entity_id.slice(0, 8) + "…" : "—"}</span>}</TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableCell />
                          <TableCell colSpan={5} className="text-xs py-3"><DetailsView details={l.details} /></TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
                {logs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum log registrado ainda</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Carregando…" : "Carregar mais"}</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
