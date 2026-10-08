import type { Book } from "@/types"

// Exemplares livres para empréstimo; null quando o estoque não é controlado
export function availableCopies(b: Book): number | null {
  return b.copies == null ? null : Math.max(0, b.copies - (b.active_loans ?? 0))
}
