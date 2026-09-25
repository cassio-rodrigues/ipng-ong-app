// Links wa.me com mensagem pronta. Telefones são livres no cadastro ("(11) 98765-4321",
// "11987654321", "+55 11 ..."), então normalizamos para o formato internacional.
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "")
  if (digits.length === 10 || digits.length === 11) return `55${digits}`  // DDD + número
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits
  return null
}

export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  const n = whatsappNumber(phone)
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(message)}` : null
}

export function firstName(name: string | null | undefined) {
  return (name ?? "").trim().split(/\s+/)[0] ?? ""
}
