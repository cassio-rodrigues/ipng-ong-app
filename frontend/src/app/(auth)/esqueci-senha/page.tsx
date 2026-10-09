"use client"

import { useState } from "react"
import Link from "next/link"
import { MailCheck } from "lucide-react"
import { authApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ detail: string; email_enabled: boolean } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.forgotPassword(email.trim())
      setResult(data)
    } catch {
      // Erros (ex.: muitas tentativas) já aparecem pelo aviso da API
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center pb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="IPNG" className="h-20 w-auto object-contain" />
          <h1 className="text-lg font-semibold pt-2">Esqueci minha senha</h1>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-4 text-center">
              <MailCheck className={`mx-auto size-10 ${result.email_enabled ? "text-green-600" : "text-muted-foreground"}`} />
              <p className="text-sm">{result.detail}</p>
              {result.email_enabled && (
                <p className="text-xs text-muted-foreground">O link vale por 30 minutos e só pode ser usado uma vez.</p>
              )}
              <Button asChild variant="outline" className="w-full"><Link href="/login">Voltar para o login</Link></Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">Informe o email da sua conta. Vamos enviar um link para você criar uma nova senha.</p>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enviando…" : "Enviar link"}</Button>
              <p className="text-center text-sm">
                <Link href="/login" className="text-muted-foreground underline-offset-2 hover:underline">Voltar para o login</Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
