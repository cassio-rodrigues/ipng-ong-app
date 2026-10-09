"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { authApi } from "@/lib/api"
import type { User } from "@/types"
import { clearSession, getSession, saveSession, updateSession } from "@/lib/session"

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = getSession("user")
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        // ignore
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(
    async (email: string, password: string, remember = false) => {
      const { data } = await authApi.login(email, password)
      saveSession({ access_token: data.access_token, refresh_token: data.refresh_token }, remember)
      const meRes = await authApi.me()
      updateSession({ user: JSON.stringify(meRes.data) })
      setUser(meRes.data)
      router.push("/inicio")
    },
    [router]
  )

  const refreshUser = useCallback(async () => {
    const meRes = await authApi.me()
    updateSession({ user: JSON.stringify(meRes.data) })
    setUser(meRes.data)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
    router.push("/login")
  }, [router])

  // Encerra as sessões em todos os dispositivos (computadores da ONG, celular…)
  const logoutAll = useCallback(async () => {
    try { await authApi.logoutAll() } finally { logout() }
  }, [logout])

  return { user, loading, login, logout, logoutAll, refreshUser, canEdit: user?.role !== "teacher", isTeacher: user?.role === "teacher" }
}
