"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { authApi } from "@/lib/api"
import type { User } from "@/types"

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("user")
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
    async (email: string, password: string) => {
      const { data } = await authApi.login(email, password)
      localStorage.setItem("access_token", data.access_token)
      localStorage.setItem("refresh_token", data.refresh_token)
      const meRes = await authApi.me()
      localStorage.setItem("user", JSON.stringify(meRes.data))
      setUser(meRes.data)
      router.push("/dashboard")
    },
    [router]
  )

  const logout = useCallback(() => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user")
    setUser(null)
    router.push("/login")
  }, [router])

  return { user, loading, login, logout, canEdit: user?.role !== "teacher" }
}
