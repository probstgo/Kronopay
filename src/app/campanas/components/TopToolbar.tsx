'use client'

import { useState } from 'react'
import { ArrowLeft, Plus, BarChart3, Settings, Lightbulb, Play, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface NodeType {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

interface TopToolbarProps {
  onAddNode?: (nodeType: string) => void
  availableNodeTypes?: NodeType[]
  onAddNote?: () => void
}

export function TopToolbar({ onAddNode, availableNodeTypes = [], onAddNote }: TopToolbarProps) {
  const [nodesMenuOpen, setNodesMenuOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [executeOpen, setExecuteOpen] = useState(false)
  const [campaignName, setCampaignName] = useState('Campaña de Cobranza')
  const [campaignDescription, setCampaignDescription] = useState('')

  const handleNodeSelect = (nodeType: string) => {
    if (onAddNode) {
      onAddNode(nodeType)
    }
    setNodesMenuOpen(false)
  }

  const handleExecute = () => {
    // Aquí se agregaría la lógica de ejecución cuando se conecte con el backend
    setExecuteOpen(false)
    // Simulación: mostrar mensaje de éxito
    alert('Campaña ejecutada exitosamente')
  }

  return (
    <>
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  disabled
                  className="flex items-center space-x-2 text-gray-400 cursor-not-allowed"
                  aria-label="Volver atrás (desactivado)"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>{campaignName}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Botón desactivado</p>
              </TooltipContent>
            </Tooltip>
        </div>
        
        <div className="flex items-center space-x-2">
            {/* Botón Agregar Nodos */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setNodesMenuOpen(true)}
                  className="h-9 w-9"
                  aria-label="Agregar nodos"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Agregar nodos al canvas</p>
              </TooltipContent>
            </Tooltip>

            {/* Botón Agregar Nota */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onAddNote?.()}
                  className="h-9 w-9"
                  aria-label="Agregar nota"
                >
                  <StickyNote className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Agregar nota</p>
              </TooltipContent>
            </Tooltip>

            {/* Botón Analytics */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAnalyticsOpen(true)}
                  className="h-9 w-9"
                  aria-label="Analytics"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver estadísticas y reportes</p>
              </TooltipContent>
            </Tooltip>

            {/* Botón Configuración */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSettingsOpen(true)}
                  className="h-9 w-9"
                  aria-label="Configuración"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Configuración de la campaña</p>
              </TooltipContent>
            </Tooltip>

            {/* Botón Ayuda */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setHelpOpen(true)}
                  className="h-9 w-9"
                  aria-label="Ayuda"
                >
                  <Lightbulb className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ayuda y sugerencias</p>
              </TooltipContent>
            </Tooltip>

            {/* Botón Ejecutar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setExecuteOpen(true)}
                  className="bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-2"
                  aria-label="Ejecutar campaña"
                >
                  <Play className="h-4 w-4" />
                  Ejecutar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ejecutar la campaña de cobranza</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Modal de Selección de Nodos */}
      <Dialog open={nodesMenuOpen} onOpenChange={setNodesMenuOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Agregar Nodo</DialogTitle>
            <DialogDescription>
              Selecciona el tipo de nodo que deseas agregar al canvas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {availableNodeTypes.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {availableNodeTypes.map((nodeType) => (
                  <button
                    key={nodeType.id}
                    onClick={() => handleNodeSelect(nodeType.id)}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left border border-gray-200 hover:border-gray-300"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0 ${
                      nodeType.color === 'blue' ? 'bg-blue-500' :
                      nodeType.color === 'green' ? 'bg-green-500' :
                      nodeType.color === 'purple' ? 'bg-purple-500' :
                      nodeType.color === 'yellow' ? 'bg-yellow-500' :
                      nodeType.color === 'orange' ? 'bg-orange-500' :
                      'bg-indigo-500'
                    }`}>
                      {nodeType.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{nodeType.name}</div>
                      <div className="text-sm text-gray-600">{nodeType.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No hay tipos de nodos disponibles</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNodesMenuOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Panel de Analytics */}
      <Sheet open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Estadísticas y Reportes</SheetTitle>
            <SheetDescription>
              Vista general de las métricas de tu campaña
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Métricas Generales</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-xs text-gray-500 mt-1">Ejecuciones</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">0%</p>
                  <p className="text-xs text-gray-500 mt-1">Tasa de éxito</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-xs text-gray-500 mt-1">Contactos</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-xs text-gray-500 mt-1">Pagos recibidos</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Estado</h3>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  La campaña aún no ha sido ejecutada. Ejecuta la campaña para ver estadísticas en tiempo real.
                </p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal de Configuración */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configuración de la Campaña</DialogTitle>
            <DialogDescription>
              Modifica la información básica de tu campaña
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Nombre de la campaña</Label>
              <Input
                id="campaign-name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Nombre de la campaña"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-description">Descripción</Label>
              <Textarea
                id="campaign-description"
                value={campaignDescription}
                onChange={(e) => setCampaignDescription(e.target.value)}
                placeholder="Describe el propósito de esta campaña..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setSettingsOpen(false)}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Ayuda */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ayuda y Sugerencias</DialogTitle>
            <DialogDescription>
              Guía rápida para usar el editor de campañas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-sm mb-1">Cómo crear una campaña</h3>
                <p className="text-sm text-gray-600">
                  Haz clic en el botón &quot;+&quot; para agregar nodos a tu campaña. Conecta los nodos arrastrando desde los puntos de conexión.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Tipos de nodos</h3>
                <p className="text-sm text-gray-600">
                  Puedes usar Email, SMS, Llamadas, Esperas, Condiciones y Estadísticas para crear flujos complejos de cobranza.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Ejecutar campaña</h3>
                <p className="text-sm text-gray-600">
                  Una vez configurada tu campaña, haz clic en &quot;Ejecutar&quot; para iniciar el proceso de cobranza automático.
                </p>
        </div>
      </div>
    </div>
          <DialogFooter>
            <Button onClick={() => setHelpOpen(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmación de Ejecución */}
      <AlertDialog open={executeOpen} onOpenChange={setExecuteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Ejecutar campaña?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción iniciará la ejecución de la campaña &quot;{campaignName}&quot;. 
              Los deudores seleccionados recibirán los mensajes y llamadas según la configuración de los nodos.
              <br /><br />
              ¿Estás seguro de que deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecute}>
              Ejecutar campaña
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
