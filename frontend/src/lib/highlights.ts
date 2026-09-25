// Cores dos destaques (REC-A4): verde positivo, vermelho negativo, amarelo para os demais tipos
export const HIGHLIGHT_LABEL: Record<string, string> = { positive: "Positivo", negative: "Negativo" }

export function highlightBadgeClass(type: string | null | undefined) {
  if (type === "positive") return "border-transparent bg-green-600 text-white dark:bg-green-500"
  if (type === "negative") return "border-transparent bg-red-600 text-white dark:bg-red-500"
  return "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
}
