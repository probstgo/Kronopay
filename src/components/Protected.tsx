"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

type Props = { children: React.ReactNode }

export default function Protected({ children }: Props) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <span className="text-sm text-muted-foreground">Verificando acceso…</span>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}


