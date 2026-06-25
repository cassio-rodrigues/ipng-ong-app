"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usersApi, unitsApi, studentsApi, classesApi } from "@/lib/api"
import { Building2, GraduationCap, UserCheck, Users } from "lucide-react"

interface Stat {
  label: string
  value: number
  icon: React.ElementType
  color: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, unitsRes, studentsRes, classesRes] = await Promise.all([
          usersApi.list({ limit: 1 }),
          unitsApi.list(),
          studentsApi.list(),
          classesApi.list(),
        ])
        setStats([
          { label: "Usuários", value: usersRes.data.length, icon: Users, color: "text-blue-500" },
          { label: "Unidades", value: unitsRes.data.length, icon: Building2, color: "text-green-500" },
          { label: "Alunos", value: studentsRes.data.length, icon: UserCheck, color: "text-purple-500" },
          { label: "Turmas ativas", value: classesRes.data.filter((c: { status: string }) => c.status === "active").length, icon: GraduationCap, color: "text-orange-500" },
        ])
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className={`size-5 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
