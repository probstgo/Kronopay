import { z } from 'zod'

// Schema para un nodo del canvas
const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  data: z.record(z.string(), z.any())
})

// Schema para una conexión (edge) del canvas
const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.string().optional(),
  animated: z.boolean().optional()
})

// Schema para una nota del canvas
const noteSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
})

// Schema para canvas_data
export const canvasDataSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
  notes: z.array(noteSchema).optional()
})

// Schema para el payload completo de guardado
export const saveCampanaSchema = z.object({
  nombre: z.string().min(1, 'El nombre de la campaña es requerido').max(255),
  descripcion: z.string().optional().nullable(),
  canvas_data: canvasDataSchema,
  configuracion: z.record(z.string(), z.any()).optional().default({}),
  estado: z.enum(['borrador', 'activo', 'pausado', 'archivado']).optional().default('borrador')
})

// Schema para actualizar canvas_data y opcionalmente nombre/descripción
export const updateCanvasSchema = z.object({
  canvas_data: canvasDataSchema,
  nombre: z.string().min(1).max(255).optional(),
  descripcion: z.string().optional().nullable()
})

// Tipo TypeScript inferido del schema
export type SaveCampanaInput = z.infer<typeof saveCampanaSchema>
export type CanvasDataInput = z.infer<typeof canvasDataSchema>
export type UpdateCanvasInput = z.infer<typeof updateCanvasSchema>

