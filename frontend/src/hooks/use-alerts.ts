"use client"

import { useCallback, useEffect, useState } from "react"
import { alertsApi } from "@/lib/api"
import type { Alert } from "@/types"

// Disparado após registrar uma ação, para que contadores em outras partes da tela
// (sidebar, início) se atualizem sem recarregar a página.
export const ALERTS_CHANGED = "alerts:changed"

export function notifyAlertsChanged() {
  window.dispatchEvent(new Event(ALERTS_CHANGED))
}

export function useAlerts(params?: { student_id?: string; class_id?: string; lesson_id?: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const { student_id, class_id, lesson_id } = params ?? {}

  const reload = useCallback(async () => {
    try {
      const { data } = await alertsApi.list({ student_id, class_id, lesson_id })
      setAlerts(data)
    } finally {
      setLoading(false)
    }
  }, [student_id, class_id, lesson_id])

  useEffect(() => {
    reload()
    window.addEventListener(ALERTS_CHANGED, reload)
    return () => window.removeEventListener(ALERTS_CHANGED, reload)
  }, [reload])

  return { alerts, loading, reload }
}
