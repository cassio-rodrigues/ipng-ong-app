"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    router.replace(token ? "/inicio" : "/login")
  }, [router])

  return null
}
