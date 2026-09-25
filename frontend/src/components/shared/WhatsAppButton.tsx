import { MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { whatsappLink } from "@/lib/whatsapp"

// Abre o WhatsApp (app ou web) com a mensagem preenchida; nada é enviado sem o usuário confirmar.
// Sem telefone válido, não renderiza nada.
export function WhatsAppButton({
  phone, message, label = "WhatsApp", className, iconOnly = false,
}: { phone: string | null | undefined; message: string; label?: string; className?: string; iconOnly?: boolean }) {
  const href = whatsappLink(phone, message)
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={iconOnly ? label : undefined}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md bg-[#25D366] px-3 h-8 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1ebe5b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        iconOnly && "px-2",
        className,
      )}
    >
      <MessageCircle className="size-4" />
      {!iconOnly && label}
    </a>
  )
}
