"use client"

import { useEffect } from "react"
import { getSession } from "@/lib/session"
import { useRouter } from "next/navigation"

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const token = getSession("access_token")
    router.replace(token ? "/inicio" : "/login")
  }, [router])

  return null
}
