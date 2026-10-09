"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [remember, setRemember] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password, remember)
    } catch {
      setError("Email ou senha inválidos.")
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
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ipng.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link href="/esqueci-senha" className="text-xs text-muted-foreground underline-offset-2 hover:underline">Esqueceu sua senha?</Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="h-4 w-4 mt-0.5" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span>
                Manter conectado
                <span className="block text-xs text-muted-foreground">Não marque em computador compartilhado.</span>
              </span>
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link href="/privacidade" className="underline-offset-2 hover:underline">Política de privacidade</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
