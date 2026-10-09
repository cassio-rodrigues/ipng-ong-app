"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { authApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { PASSWORD_MIN } from "@/components/shared/ChangePasswordModal"

function ResetForm() {
  const token = useSearchParams().get("token") ?? ""
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { toast.error("As senhas não coincidem"); return }
    setLoading(true)
    try {
      const { data } = await authApi.resetPassword(token, password)
      toast.success(data.detail)
      router.replace("/login")
    } catch {
      // Link expirado/usado: a mensagem do servidor já aparece pelo aviso da API
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm">Link incompleto. Abra o link exatamente como chegou no email ou peça um novo.</p>
        <Button asChild className="w-full"><Link href="/esqueci-senha">Pedir novo link</Link></Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
          required minLength={PASSWORD_MIN} autoComplete="new-password" autoFocus />
        <p className="text-[11px] text-muted-foreground">Mínimo de {PASSWORD_MIN} caracteres.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirmar nova senha</Label>
        <Input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Salvando…" : "Salvar nova senha"}</Button>
      <p className="text-center text-sm">
        <Link href="/esqueci-senha" className="text-muted-foreground underline-offset-2 hover:underline">Link expirado? Peça outro</Link>
      </p>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center pb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="IPNG" className="h-20 w-auto object-contain" />
          <h1 className="text-lg font-semibold pt-2">Criar nova senha</h1>
        </CardHeader>
        <CardContent>
          {/* useSearchParams exige Suspense para o build de produção */}
          <Suspense fallback={<p className="text-sm text-muted-foreground text-center">Carregando…</p>}>
            <ResetForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
