import { AlertTriangle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { attendanceLevel, formatRate, ATTENDANCE_LEVEL_LABEL } from "@/lib/attendance"

const PILL: Record<string, string> = {
  critical: "bg-red-600 text-white dark:bg-red-500",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  ok: "text-foreground",
  none: "text-muted-foreground",
}

// Frequência em linha de tabela: crítica vira pílula vermelha sólida com ícone,
// atenção fica em âmbar, regular permanece neutra para não competir visualmente.
export function AttendanceRate({ rate, total = 1, className }: { rate: number; total?: number; className?: string }) {
  const level = attendanceLevel(rate, total)
  return (
    <span
      title={ATTENDANCE_LEVEL_LABEL[level]}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 tabular-nums",
        level === "critical" && "font-bold",
        level === "warning" && "font-semibold",
        PILL[level],
        className,
      )}
    >
      {level === "critical" && <AlertTriangle className="size-3.5" aria-hidden />}
      {level === "warning" && <AlertCircle className="size-3.5" aria-hidden />}
      {level === "none" ? "—" : formatRate(rate)}
      <span className="sr-only"> ({ATTENDANCE_LEVEL_LABEL[level]})</span>
    </span>
  )
}
