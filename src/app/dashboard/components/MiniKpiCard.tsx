'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LucideIcon } from 'lucide-react'

interface MiniKpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  loading?: boolean
  iconColor?: string
}

export function MiniKpiCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  loading,
  iconColor
}: MiniKpiCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32" />
          {subtitle && <Skeleton className="h-3 w-20 mt-2" />}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{title}</span>
          {Icon && (
            <Icon 
              className={`h-4 w-4 ${iconColor || 'text-muted-foreground'}`} 
            />
          )}
        </div>
        <div className="text-2xl font-semibold">{value}</div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  )
}

