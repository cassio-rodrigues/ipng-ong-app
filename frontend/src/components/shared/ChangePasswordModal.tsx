"use client"

import { useState } from "react"
import { authApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

interface Props {
  onSuccess: () => void
}

export function ChangePasswordModal({ onSuccess }: Props) {
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
    if (next.length < 6) {
      toast.error("A nova senha deve ter ao menos 6 caracteres")
      return
    }
    setSaving(true)
    try {
      await authApi.changePassword(current, next)
      toast.success("Senha alterada com sucesso!")
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open>
      <DialogContent className="max-w-md" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Altere sua senha</DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">
            Por segurança, você precisa definir uma nova senha antes de continuar.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Senha atual</Label>
            <Input type="password" value={current} onChange={e => setCurrent(e.target.value)} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input type="password" value={next} onChange={e => setNext(e.target.value)} required />
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
