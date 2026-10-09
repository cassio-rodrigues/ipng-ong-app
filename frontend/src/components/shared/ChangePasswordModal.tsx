"use client"

import { useState } from "react"
import { updateSession } from "@/lib/session"
import { authApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

export const PASSWORD_MIN = 8

interface Props {
  onSuccess: () => void
  /** Obrigatória (primeiro acesso / exigida pelo admin): não fecha sem trocar */
  forced?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ChangePasswordModal({ onSuccess, forced = true, open = true, onOpenChange }: Props) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) {
      toast.error("As senhas não coincidem")
      return
    }
    if (next.length < PASSWORD_MIN) {
      toast.error(`A nova senha deve ter ao menos ${PASSWORD_MIN} caracteres`)
      return
    }
    if (next === current) {
      toast.error("A nova senha precisa ser diferente da atual")
      return
    }
    setSaving(true)
    try {
      // A troca de senha encerra as outras sessões; esta continua com os tokens novos
      const { data } = await authApi.changePassword(current, next)
      updateSession({ access_token: data.access_token, refresh_token: data.refresh_token })
      toast.success("Senha alterada com sucesso!")
      setCurrent(""); setNext(""); setConfirm("")
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={forced ? undefined : onOpenChange}>
      <DialogContent
        className={forced ? "max-w-md [&>button:last-child]:hidden" : "max-w-md"}
        onInteractOutside={e => forced && e.preventDefault()}
        onEscapeKeyDown={e => forced && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{forced ? "Altere sua senha" : "Alterar senha"}</DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">
            {forced
              ? "Por segurança, você precisa definir uma nova senha antes de continuar."
              : "Ao trocar a senha, as sessões abertas em outros computadores são encerradas."}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Senha atual</Label>
            <Input type="password" value={current} onChange={e => setCurrent(e.target.value)} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input type="password" value={next} onChange={e => setNext(e.target.value)} required minLength={PASSWORD_MIN} autoComplete="new-password" />
            <p className="text-[11px] text-muted-foreground">Mínimo de {PASSWORD_MIN} caracteres.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar nova senha</Label>
            <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando…" : "Alterar senha"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
