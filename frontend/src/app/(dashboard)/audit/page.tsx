"use client"

import { useEffect, useState } from "react"
import { auditApi } from "@/lib/api"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface AuditLog { id: string; user_id: string | null; action: string | null; entity_type: string | null; entity_id: string | null; created_at: string | null }

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { const { data } = await auditApi.list({ limit: 100 }); setLogs(data) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Logs de Auditoria</h1>
          <p className="text-sm text-muted-foreground mt-1">Registro das ações executadas no sistema</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />Atualizar
        </Button>
      </div>

      {loading ? <p className="text-muted-foreground text-sm">Carregando…</p> : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Data/Hora</TableHead><TableHead>Ação</TableHead><TableHead>Entidade</TableHead><TableHead>ID afetado</TableHead><TableHead>Usuário</TableHead></TableRow></TableHeader>
            <TableBody>
              {logs.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground">{l.created_at ? new Date(l.created_at).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell>{l.action ? <Badge variant="outline">{l.action}</Badge> : "—"}</TableCell>
                  <TableCell>{l.entity_type ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{l.entity_id ? l.entity_id.slice(0, 8) + "…" : "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{l.user_id ? l.user_id.slice(0, 8) + "…" : "—"}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum log registrado ainda</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
