"use client"

import { useState } from "react"
import { Check, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { whatsappLink } from "@/lib/whatsapp"
import { FIELD_LABEL, renderTemplate, TEMPLATE_BY_ID, WHATSAPP_TEMPLATES, type TemplateField } from "@/lib/whatsapp-templates"

export interface WhatsAppRecipient {
  id: string
  name: string | null
  phone: string | null
  className?: string | null
}

const FIELD_PLACEHOLDER: Record<TemplateField, string> = {
  data: "Ex.: sábado, 15/11",
  horario: "Ex.: 9h às 13h",
  local: "Ex.: Parque Ibirapuera, portão 3",
}

// Escolhe um modelo, preenche os dados do evento e abre o WhatsApp de cada pessoa.
// O WhatsApp não permite envio em massa por link: cada clique abre uma conversa com a
// mensagem pronta, e a pessoa só recebe depois que o usuário apertar enviar lá.
export function WhatsAppSendDialog({
  open, onOpenChange, recipients, defaultTemplate = "contato", title = "Enviar mensagem no WhatsApp",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipients: WhatsAppRecipient[]
  defaultTemplate?: string
  title?: string
}) {
  const [templateId, setTemplateId] = useState(defaultTemplate)
  const [text, setText] = useState(TEMPLATE_BY_ID[defaultTemplate]?.text ?? "")
  const [fields, setFields] = useState<Record<TemplateField, string>>({ data: "", horario: "", local: "" })
  const [sent, setSent] = useState<Set<string>>(new Set())

  const template = TEMPLATE_BY_ID[templateId]
  const missingFields = (template?.fields ?? []).filter(f => !fields[f].trim())
  const withPhone = recipients.filter(r => whatsappLink(r.phone, "x"))
  const withoutPhone = recipients.filter(r => !whatsappLink(r.phone, "x"))

  // Abertura é controlada pelo pai; ao fechar, volta ao estado inicial para o próximo uso
  function handleOpenChange(o: boolean) {
    if (!o) {
      setTemplateId(defaultTemplate)
      setText(TEMPLATE_BY_ID[defaultTemplate]?.text ?? "")
      setSent(new Set())
    }
    onOpenChange(o)
  }

  function chooseTemplate(id: string) {
    setTemplateId(id)
    setText(TEMPLATE_BY_ID[id]?.text ?? "")
  }

  const messageFor = (r: WhatsAppRecipient) =>
    renderTemplate(text, { name: r.name, className: r.className, ...fields })

  const preview = recipients[0] ? messageFor(recipients[0]) : ""

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <Select value={templateId} onValueChange={chooseTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WHATSAPP_TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {template && template.fields.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {template.fields.map(f => (
                <div key={f} className="space-y-1.5">
                  <Label>{FIELD_LABEL[f]}</Label>
                  <Input value={fields[f]} onChange={e => setFields(v => ({ ...v, [f]: e.target.value }))} placeholder={FIELD_PLACEHOLDER[f]} />
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={7}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
            />
            <p className="text-[11px] text-muted-foreground">
              Pode editar à vontade. <code>{"{nome}"}</code> e <code>{"{turma}"}</code> são trocados pelos dados de cada aluno.
            </p>
          </div>

          {preview && (
            <div className="space-y-1.5">
              <Label>Prévia{recipients.length > 1 && <span className="font-normal text-muted-foreground"> — {recipients[0].name}</span>}</Label>
              <div className="whitespace-pre-wrap rounded-lg bg-[#DCF8C6] px-3 py-2 text-sm text-neutral-900 dark:bg-[#005C4B] dark:text-neutral-50">{preview}</div>
            </div>
          )}

          {missingFields.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Preencha {missingFields.map(f => FIELD_LABEL[f].toLowerCase()).join(", ")} para liberar o envio.
            </p>
          )}

          <div className="space-y-1.5">
            <Label>
              Destinatários
              {recipients.length > 1 && <span className="font-normal text-muted-foreground"> — {sent.size} de {withPhone.length} aberto(s)</span>}
            </Label>
            <div className="rounded-md border divide-y max-h-64 overflow-y-auto">
              {withPhone.map(r => {
                const href = whatsappLink(r.phone, messageFor(r))!
                const done = sent.has(r.id)
                return (
                  <div key={r.id} className={cn("flex items-center gap-3 px-3 py-2 text-sm", done && "bg-muted/50")}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{r.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{[r.className, r.phone].filter(Boolean).join(" · ")}</p>
                    </div>
                    {missingFields.length > 0 ? (
                      <Button size="sm" disabled className="h-8"><MessageCircle className="size-4 mr-1.5" />Abrir</Button>
                    ) : (
                      <a
                        href={href} target="_blank" rel="noopener noreferrer"
                        onClick={() => setSent(s => new Set(s).add(r.id))}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-3 h-8 text-sm font-medium shadow-sm transition-colors",
                          done ? "border bg-background text-muted-foreground hover:bg-muted" : "bg-[#25D366] text-white hover:bg-[#1ebe5b]",
                        )}
                      >
                        {done ? <><Check className="size-4" />Aberto</> : <><MessageCircle className="size-4" />Abrir</>}
                      </a>
                    )}
                  </div>
                )
              })}
              {withoutPhone.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm opacity-60">
                  <p className="flex-1 truncate">{r.name ?? "—"}</p>
                  <span className="text-xs">Sem WhatsApp válido</span>
                </div>
              ))}
              {recipients.length === 0 && <p className="px-3 py-4 text-center text-sm text-muted-foreground">Nenhum destinatário</p>}
            </div>
            {recipients.length > 1 && (
              <p className="text-[11px] text-muted-foreground">Cada botão abre a conversa com a mensagem pronta; confirme o envio no WhatsApp e volte para o próximo.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
