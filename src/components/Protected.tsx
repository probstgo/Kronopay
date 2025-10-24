"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

type Props = { children: React.ReactNode }

export default function Protected({ children }: Props) {
  const { user, loading, initialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (initialized && !user) {
      router.replace("/login")
    }
  }, [initialized, user, router])

  if (!initialized || loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <span className="text-sm text-muted-foreground">Verificando acceso…</span>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}


