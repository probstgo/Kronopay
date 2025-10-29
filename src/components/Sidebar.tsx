"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useState } from "react"
import {
  Users,
  Megaphone,
  History,
  FileText,
  CreditCard,
  Receipt,
  Home,
  User,
  LogOut,
  Phone
} from "lucide-react"

const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Gestión de Deudores",
    href: "/deudores",
    icon: Users,
  },
  {
    title: "Campañas",
    href: "/campanas",
    icon: Megaphone,
  },
  {
    title: "Historial",
    href: "/historial",
    icon: History,
  },
  {
    title: "Plantillas",
    href: "/plantillas",
    icon: FileText,
  },
  {
    title: "Teléfono",
    href: "/telefono",
    icon: Phone,
  },
  {
    title: "Pagos",
    href: "/pagos",
    icon: CreditCard,
  },
  {
    title: "Suscripciones",
    href: "/billing",
    icon: Receipt,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleLogout = async () => {
    try {
      setSigningOut(true)
      // 1) Cerrar sesión en el cliente (limpia storage)
      await signOut()
      // 2) Cerrar sesión en el servidor (limpia cookies HTTP-only)
      await fetch('/api/auth/signout', { method: 'POST' })
      // 3) Redirigir al home
      router.push('/')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      {/* Header */}
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">KronoPay</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-primary text-primary-foreground"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="border-t p-4 space-y-2">
        <Link href="/profile">
          <Button variant="ghost" className="w-full justify-start">
            <User className="mr-2 h-4 w-4" />
            Mi Perfil
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
          disabled={signingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {signingOut ? 'Cerrando...' : 'Cerrar Sesión'}
        </Button>
      </div>
    </div>
  )
}
