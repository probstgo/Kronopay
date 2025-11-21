'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, 
  Mail, 
  Phone, 
  DollarSign, 
  Calendar,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  CreditCard
} from 'lucide-react';
// Funciones de validación locales para evitar problemas de importación
const validarRUT = (rut: string): boolean => {
  if (!rut) return false;
  const rutLimpio = rut.replace(/[^0-9kK]/g, '');
  if (rutLimpio.length < 8) return false;
  
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toLowerCase();
  
  let suma = 0;
  let multiplicador = 2;
  
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  const resto = suma % 11;
  const dvCalculado = resto === 0 ? '0' : resto === 1 ? 'k' : (11 - resto).toString();
  
  return dv === dvCalculado;
};

const validarEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validarTelefono = (telefono: string): boolean => {
  const telefonoLimpio = telefono.replace(/[^0-9]/g, '');
  return telefonoLimpio.length >= 8 && telefonoLimpio.length <= 15;
};

const formatearRUT = (rut: string): string => {
  if (!rut) return '';
  const rutLimpio = rut.replace(/[^0-9kK]/g, '');
  if (rutLimpio.length < 8) return rut;
  
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toUpperCase();
  
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
};

const normalizarRUT = (rut: string): string => {
  if (!rut) return '';
  const rutLimpio = rut.replace(/[^0-9kK]/g, '');
  if (rutLimpio.length < 8) return rut;
  
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toUpperCase();
  
  return `${cuerpo}-${dv}`;
};

type EstadoDeuda = 'nueva' | 'pagado' | 'vigente' | 'vencida' | 'cancelada';
const ESTADOS_DISPONIBLES: EstadoDeuda[] = ['nueva', 'pagado', 'vigente', 'vencida', 'cancelada'];
const normalizarEstadoDeuda = (valor?: string): EstadoDeuda | undefined => {
  if (!valor) return undefined;
  if (ESTADOS_DISPONIBLES.includes(valor as EstadoDeuda)) {
    return valor as EstadoDeuda;
  }
  return undefined;
};
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { determinarEstadoInicialDeuda } from '@/lib/database';

interface Contacto {
  id: string;
  usuario_id: string;
  deudor_id: string;
  rut: string;
  tipo_contacto: 'email' | 'telefono' | 'sms' | 'whatsapp';
  valor: string;
  preferido: boolean;
  created_at: string;
}

interface Deuda {
  id: string;
  usuario_id: string;
  deudor_id: string;
  rut: string;
  monto: number;
  fecha_vencimiento: string;
  estado: EstadoDeuda;
  created_at: string;
}

interface DeudorConDatos {
  id: string;
  usuario_id: string;
  rut: string;
  nombre: string;
  created_at: string;
  deudas: Deuda[];
  contactos: Contacto[];
  email?: string;
  telefono?: string;
  monto_total?: number;
  fecha_vencimiento_mas_reciente?: string;
  estado_general?: string;
}

interface DeudorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deudor?: DeudorConDatos | null;
  deudaId?: string | null; // ID de la deuda específica a editar
}

interface FormData {
  nombre: string;
  rut: string;
  // Campos de contacto
  email?: string;
  telefono?: string;
  // Campos de deuda
  monto?: number;
  fecha_vencimiento?: string;
  estado_deuda?: EstadoDeuda;
}

interface FormErrors {
  nombre?: string;
  rut?: string;
  email?: string;
  telefono?: string;
  monto?: string;
  fecha_vencimiento?: string;
}

export function DeudorForm({ isOpen, onClose, onSuccess, deudor, deudaId }: DeudorFormProps) {
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    rut: '',
    email: '',
    telefono: '',
    monto: undefined,
    fecha_vencimiento: '',
    estado_deuda: undefined
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado para actividad de la deuda
  const [actividadDeuda, setActividadDeuda] = useState<{
    tieneProgramacionesPendientes: boolean;
    tieneHistorial: boolean;
    tienePagos: boolean;
    cantidadProgramaciones: number;
    cantidadHistorial: number;
    cantidadPagos: number;
  } | null>(null);
  const [cargandoActividad, setCargandoActividad] = useState(false);

  // Función para consultar actividad de la deuda
  const consultarActividadDeuda = async (deudaId: string) => {
    setCargandoActividad(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Consultar programaciones pendientes
      const { data: programaciones, count: countProgramaciones } = await supabase
        .from('programaciones')
        .select('id', { count: 'exact', head: true })
        .eq('deuda_id', deudaId)
        .eq('estado', 'pendiente');

      // Consultar historial
      const { data: historial, count: countHistorial } = await supabase
        .from('historial')
        .select('id', { count: 'exact', head: true })
        .eq('deuda_id', deudaId);

      // Consultar pagos
      const { data: pagos, count: countPagos } = await supabase
        .from('pagos')
        .select('id', { count: 'exact', head: true })
        .eq('deuda_id', deudaId);

      setActividadDeuda({
        tieneProgramacionesPendientes: (countProgramaciones || 0) > 0,
        tieneHistorial: (countHistorial || 0) > 0,
        tienePagos: (countPagos || 0) > 0,
        cantidadProgramaciones: countProgramaciones || 0,
        cantidadHistorial: countHistorial || 0,
        cantidadPagos: countPagos || 0,
      });
    } catch (error) {
      console.error('Error al consultar actividad de deuda:', error);
      setActividadDeuda(null);
    } finally {
      setCargandoActividad(false);
    }
  };

  // Precargar datos si es modo edición
  useEffect(() => {
    if (deudor && isOpen) {
      // Buscar la deuda específica si se proporciona deudaId, sino usar la primera
      let deudaAEditar: Deuda | null = null;
      
      if (deudaId && deudor.deudas) {
        // Buscar la deuda específica por ID
        deudaAEditar = deudor.deudas.find(d => d.id === deudaId) || null;
      } else if (deudor.deudas && deudor.deudas.length > 0) {
        // Si no se especifica, usar la primera deuda
        deudaAEditar = deudor.deudas[0];
      }

      setFormData({
        nombre: deudor.nombre || '',
        rut: deudor.rut || '',
        email: deudor.email || '',
        telefono: deudor.telefono || '',
        monto: deudaAEditar?.monto || deudor.monto_total || undefined,
        fecha_vencimiento: deudaAEditar?.fecha_vencimiento || deudor.fecha_vencimiento_mas_reciente || '',
        estado_deuda: normalizarEstadoDeuda(deudaAEditar?.estado || deudor.estado_general)
      });

      // Consultar actividad si hay una deuda específica
      if (deudaAEditar?.id) {
        consultarActividadDeuda(deudaAEditar.id);
      } else {
        setActividadDeuda(null);
      }
    } else if (isOpen) {
      // Resetear formulario para modo agregar
      setFormData({
        nombre: '',
        rut: '',
        email: '',
        telefono: '',
        monto: undefined,
        fecha_vencimiento: '',
        estado_deuda: undefined
      });
      setActividadDeuda(null);
    }
    setErrors({});
  }, [deudor, deudaId, isOpen]);

  const handleInputChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateField = (field: keyof FormData, value: string | number | undefined): string | undefined => {
    switch (field) {
      case 'nombre':
        if (!value || !value.toString().trim()) return 'El nombre es obligatorio';
        if (value.toString().trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
        return undefined;

      case 'rut':
        if (!value || !value.toString().trim()) return 'El RUT es obligatorio';
        if (!validarRUT(value.toString())) return 'RUT inválido';
        return undefined;

      case 'email':
        if (value && !validarEmail(value.toString())) return 'Email inválido';
        return undefined;

      case 'telefono':
        if (value && !validarTelefono(value.toString())) return 'Teléfono inválido';
        return undefined;

      case 'monto':
        if (value && (typeof value !== 'number' || value <= 0)) return 'El monto debe ser mayor a 0';
        return undefined;

      case 'fecha_vencimiento':
        if (value) {
          const fecha = new Date(value.toString());
          if (isNaN(fecha.getTime())) return 'Fecha inválida';
        }
        return undefined;

      default:
        return undefined;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Validar campos obligatorios
    const requiredFields: (keyof FormData)[] = ['nombre', 'rut'];
    requiredFields.forEach(field => {
      const value = formData[field];
      const error = validateField(field, value);
      if (error) {
        newErrors[field as keyof FormErrors] = error;
        isValid = false;
      }
    });

    // Validar campos opcionales
    const optionalFields: (keyof FormData)[] = [
      'email', 'telefono', 
      'monto', 'fecha_vencimiento'
    ];
    optionalFields.forEach(field => {
      const value = formData[field];
      if (value) {
        const error = validateField(field, value);
        if (error) {
          newErrors[field as keyof FormErrors] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }

    await procesarEnvio();
  };

  const procesarEnvio = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Validar que el RUT exista y sea válido
      if (!formData.rut || !formData.rut.trim()) {
        toast.error('El RUT es obligatorio');
        setIsLoading(false);
        return;
      }

      const rutNormalizado = normalizarRUT(formData.rut.trim());

      if (deudor) {
        // Modo edición - actualizar datos básicos del deudor
        const { error: deudorError } = await supabase
          .from('deudores')
          .update({
            nombre: formData.nombre.trim(),
            rut: rutNormalizado
          })
          .eq('id', deudor.id);
        
        if (deudorError) throw deudorError;

        // Actualizar contactos si se proporcionaron
        if (formData.email || formData.telefono) {
          // Eliminar contactos existentes
          await supabase
            .from('contactos')
            .delete()
            .eq('deudor_id', deudor.id);

          // Crear nuevos contactos
          const contactos = [];
          if (formData.email) contactos.push({
            usuario_id: user.id,
            deudor_id: deudor.id,
            rut: rutNormalizado,
            tipo_contacto: 'email',
            valor: formData.email.trim(),
            preferido: true
          });
          if (formData.telefono) contactos.push({
            usuario_id: user.id,
            deudor_id: deudor.id,
            rut: rutNormalizado,
            tipo_contacto: 'telefono',
            valor: formData.telefono.trim(),
            preferido: !formData.email
          });

          if (contactos.length > 0) {
            const { error: contactosError } = await supabase
              .from('contactos')
              .insert(contactos);
            
            if (contactosError) throw contactosError;
          }
        }

        // Actualizar deuda si se proporcionó
        if (formData.monto && formData.fecha_vencimiento) {
          let deudaActualizadaId: string | null = null;
          const estadoParaGuardar = formData.estado_deuda ?? determinarEstadoInicialDeuda(formData.fecha_vencimiento);
          
          // Si se especificó una deudaId, actualizar esa deuda específica
          if (deudaId) {
            const { error: deudaError } = await supabase
              .from('deudas')
              .update({
                monto: formData.monto,
                fecha_vencimiento: formData.fecha_vencimiento,
                estado: estadoParaGuardar
              })
              .eq('id', deudaId)
              .is('eliminada_at', null); // Solo si no está eliminada
            
            if (deudaError) throw deudaError;
            deudaActualizadaId = deudaId;
          } else {
            // Si no se especificó deudaId, buscar deuda existente activa o crear nueva
            const { data: deudaExistente } = await supabase
              .from('deudas')
              .select('id')
              .eq('deudor_id', deudor.id)
              .is('eliminada_at', null)  // Solo deudas activas (soft delete)
              .limit(1)
              .maybeSingle();

            if (deudaExistente) {
              // Actualizar deuda existente
              const { error: deudaError } = await supabase
                .from('deudas')
                .update({
                  monto: formData.monto,
                  fecha_vencimiento: formData.fecha_vencimiento,
                  estado: estadoParaGuardar
                })
                .eq('id', deudaExistente.id);
              
              if (deudaError) throw deudaError;
              deudaActualizadaId = deudaExistente.id;
            } else {
              // Crear nueva deuda
              const { error: deudaError } = await supabase
                .from('deudas')
                .insert({
                  usuario_id: user.id,
                  deudor_id: deudor.id,
                  rut: rutNormalizado,
                  monto: formData.monto,
                  fecha_vencimiento: formData.fecha_vencimiento,
                  estado: estadoParaGuardar
                });
              
              if (deudaError) throw deudaError;
            }
          }

          // Actualizar programaciones pendientes si se actualizó una deuda
          if (deudaActualizadaId) {
            // Calcular días vencidos
            const fechaVencimiento = new Date(formData.fecha_vencimiento);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            fechaVencimiento.setHours(0, 0, 0, 0);
            const diasVencidos = Math.max(0, Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24)));

            // Obtener email y teléfono preferidos
            const emailPreferido = formData.email || '';
            const telefonoPreferido = formData.telefono || '';

            // Calcular nuevas variables
            const nuevasVars: Record<string, string> = {
              nombre: formData.nombre || 'Deudor',
              monto: `$${formData.monto.toLocaleString('es-CL')}`,
              fecha_vencimiento: formData.fecha_vencimiento,
              dias_vencidos: diasVencidos.toString(),
              email: emailPreferido,
              telefono: telefonoPreferido
            };

            // Actualizar programaciones pendientes de esta deuda
            const { data: programacionesPendientes } = await supabase
              .from('programaciones')
              .select('id, vars')
              .eq('deuda_id', deudaActualizadaId)
              .eq('estado', 'pendiente');

            if (programacionesPendientes && programacionesPendientes.length > 0) {
              // Actualizar cada programación pendiente
              for (const prog of programacionesPendientes) {
                // Combinar las variables existentes con las nuevas (mantener otras variables que no sean de deuda)
                const varsActualizadas = {
                  ...(prog.vars || {}),
                  ...nuevasVars
                };

                await supabase
                  .from('programaciones')
                  .update({
                    rut: rutNormalizado, // Actualizar RUT si cambió
                    vars: varsActualizadas
                  })
                  .eq('id', prog.id);
              }
            }
          }
        }

        toast.success('Deudor actualizado exitosamente');
      } else {
        // Modo agregar - crear deudor, contactos y deuda
        const { data: deudorData, error: deudorError } = await supabase
          .from('deudores')
          .insert({
            nombre: formData.nombre.trim(),
            rut: rutNormalizado,
            usuario_id: user.id
          })
          .select()
          .single();
        
        if (deudorError) throw deudorError;

        // Crear contactos si se proporcionaron
        const contactos = [];
        if (formData.email) contactos.push({
          usuario_id: user.id,
          deudor_id: deudorData.id,
          rut: rutNormalizado,
          tipo_contacto: 'email',
          valor: formData.email.trim(),
          preferido: true
        });
        if (formData.telefono) contactos.push({
          usuario_id: user.id,
          deudor_id: deudorData.id,
          rut: rutNormalizado,
          tipo_contacto: 'telefono',
          valor: formData.telefono.trim(),
          preferido: !formData.email
        });

        if (contactos.length > 0) {
          const { error: contactosError } = await supabase
            .from('contactos')
            .insert(contactos);
          
          if (contactosError) throw contactosError;
        }

        // Crear deuda si se proporcionó
        let deudaId: string | null = null
        if (formData.monto && formData.fecha_vencimiento) {
          const { data: deudaData, error: deudaError } = await supabase
            .from('deudas')
            .insert({
              usuario_id: user.id,
              deudor_id: deudorData.id,
              rut: rutNormalizado,
              monto: formData.monto,
              fecha_vencimiento: formData.fecha_vencimiento,
              estado: formData.estado_deuda || 'nueva'
            })
            .select('id')
            .single();
          
          if (deudaError) throw deudaError;
          deudaId = deudaData?.id || null

          // Hook: Evaluar triggers automáticamente para deuda nueva con fecha_vencimiento >= hoy
          if (deudaId && (!formData.estado_deuda || formData.estado_deuda === 'nueva')) {
            const fechaVenc = new Date(formData.fecha_vencimiento)
            const hoy = new Date()
            hoy.setHours(0, 0, 0, 0)
            fechaVenc.setHours(0, 0, 0, 0)
            
            if (fechaVenc >= hoy) {
              console.log(`🟢 [HOOK_DEUDOR_FORM] Ejecutando hook para deuda ${deudaId}, estado=${formData.estado_deuda || 'nueva'}`)
              // Evaluar triggers en background (no bloquear la UI)
              import('@/lib/evaluarTriggers').then(({ evaluarTriggersDeuda }) => {
                console.log(`🟢 [HOOK_DEUDOR_FORM] Llamando evaluarTriggersDeuda para deuda ${deudaId}`)
                evaluarTriggersDeuda(deudaId!).then(result => {
                  console.log(`🟢 [HOOK_DEUDOR_FORM] evaluarTriggersDeuda completado: ${result} programaciones generadas`)
                }).catch(err => {
                  console.error('🟢 [HOOK_DEUDOR_FORM] Error evaluando triggers para nueva deuda:', err)
                })
              })
            }
          }
        }

        toast.success('Deudor creado exitosamente con contactos y deuda');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al guardar deudor:', error);
      toast.error('Error al guardar el deudor. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {deudor ? 'Editar Deudor' : 'Agregar Nuevo Deudor'}
          </DialogTitle>
          <DialogDescription>
            {deudor 
              ? 'Modifica la información básica del deudor seleccionado.'
              : 'Completa toda la información del nuevo deudor, incluyendo contactos y deuda inicial.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Advertencias de actividad de deuda */}
          {actividadDeuda && (actividadDeuda.tieneProgramacionesPendientes || actividadDeuda.tieneHistorial || actividadDeuda.tienePagos) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-yellow-800 font-semibold">
                <AlertTriangle className="h-5 w-5" />
                <span>Esta deuda tiene actividad registrada</span>
              </div>
              <div className="text-sm text-yellow-700 space-y-2">
                {actividadDeuda.tieneProgramacionesPendientes && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      <strong>{actividadDeuda.cantidadProgramaciones}</strong> programación(es) pendiente(s)
                    </span>
                  </div>
                )}
                {actividadDeuda.tieneHistorial && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>
                      <strong>{actividadDeuda.cantidadHistorial}</strong> registro(s) en historial de comunicaciones
                    </span>
                  </div>
                )}
                {actividadDeuda.tienePagos && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>
                      <strong>{actividadDeuda.cantidadPagos}</strong> pago(s) registrado(s)
                    </span>
                  </div>
                )}
              </div>
              <div className="text-xs text-yellow-600 mt-2 pt-2 border-t border-yellow-300">
                ⚠️ Puedes editar la deuda, pero ten en cuenta que los cambios pueden afectar las programaciones y el historial existente.
              </div>
            </div>
          )}

          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre */}
              <div className="md:col-span-2">
                <Label htmlFor="nombre" className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Nombre completo *
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  placeholder="Ej: Juan Pérez González"
                  className={errors.nombre ? 'border-red-500' : ''}
                />
                {errors.nombre && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.nombre}
                  </div>
                )}
              </div>

              {/* RUT */}
              <div className="md:col-span-2">
                <Label htmlFor="rut" className="flex items-center gap-1">
                  RUT
                </Label>
                <Input
                  id="rut"
                  value={formData.rut}
                  onChange={(e) => handleInputChange('rut', e.target.value)}
                  placeholder="12345678-9"
                  className={errors.rut ? 'border-red-500' : ''}
                />
                {errors.rut && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.rut}
                  </div>
                )}
                {formData.rut && !errors.rut && validarRUT(formData.rut) && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    RUT válido: {formatearRUT(formData.rut)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contactos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Información de Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <Label htmlFor="email" className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Teléfono */}
              <div>
                <Label htmlFor="telefono" className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  Teléfono
                </Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  placeholder="+56 9 1234 5678"
                  className={errors.telefono ? 'border-red-500' : ''}
                />
                {errors.telefono && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.telefono}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Deuda */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Información de Deuda</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Monto */}
              <div>
                <Label htmlFor="monto" className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Monto (CLP)
                </Label>
                <Input
                  id="monto"
                  type="number"
                  value={formData.monto || ''}
                  onChange={(e) => handleInputChange('monto', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="100000"
                  className={errors.monto ? 'border-red-500' : ''}
                />
                {errors.monto && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.monto}
                  </div>
                )}
              </div>

              {/* Fecha de Vencimiento */}
              <div>
                <Label htmlFor="fecha_vencimiento" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Fecha de Vencimiento
                </Label>
                <Input
                  id="fecha_vencimiento"
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => handleInputChange('fecha_vencimiento', e.target.value)}
                  className={errors.fecha_vencimiento ? 'border-red-500' : ''}
                />
                {errors.fecha_vencimiento && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.fecha_vencimiento}
                  </div>
                )}
              </div>

              {/* Estado de Deuda */}
              <div>
                <Label htmlFor="estado_deuda" className="flex items-center gap-1">
                  Estado de Deuda
                </Label>
                <Select
                  value={formData.estado_deuda || ''}
                  onValueChange={(value) => handleInputChange('estado_deuda', value as EstadoDeuda)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nueva">Nueva</SelectItem>
                    <SelectItem value="vigente">Vigente</SelectItem>
                    <SelectItem value="vencida">Vencida</SelectItem>
                    <SelectItem value="pagado">Pagado</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {deudor ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                deudor ? 'Actualizar Deudor' : 'Crear Deudor'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
