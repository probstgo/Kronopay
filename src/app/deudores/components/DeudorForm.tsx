'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  CheckCircle
} from 'lucide-react';
import { 
  Deudor, 
  CreateDeudorData, 
  createDeudor, 
  updateDeudor,
  validarRUT, 
  validarEmail, 
  validarTelefono,
  formatearRUT,
  formatearTelefono,
  ESTADOS_DEUDA,
  ESTADOS_DEUDA_CONFIG
} from '@/lib/database';
import { parsearMontoCLP, formatearMontoCLP, validarMontoCLP, montoParaInput } from '@/lib/formateo';
import { toast } from 'sonner';

interface DeudorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deudor?: Deudor | null; // Si existe, es modo edición
}

interface FormData {
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  monto_deuda: string;
  fecha_vencimiento: string;
  estado: Deudor['estado'];
  notas?: string;
}

interface FormErrors {
  nombre?: string;
  rut?: string;
  email?: string;
  telefono?: string;
  monto_deuda?: string;
  fecha_vencimiento?: string;
  estado?: string;
}

export function DeudorForm({ isOpen, onClose, onSuccess, deudor }: DeudorFormProps) {
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    rut: '',
    email: '',
    telefono: '',
    monto_deuda: '',
    fecha_vencimiento: '',
    estado: 'nueva',
    notas: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Precargar datos si es modo edición
  useEffect(() => {
    if (deudor && isOpen) {
      setFormData({
        nombre: deudor.nombre || '',
        rut: deudor.rut || '',
        email: deudor.email || '',
        telefono: deudor.telefono || '',
        monto_deuda: deudor.monto_deuda ? montoParaInput(deudor.monto_deuda) : '',
        fecha_vencimiento: deudor.fecha_vencimiento || '',
        estado: deudor.estado || 'nueva',
        notas: ''
      });
    } else if (isOpen) {
      // Resetear formulario para modo agregar
      setFormData({
        nombre: '',
        rut: '',
        email: '',
        telefono: '',
        monto_deuda: '',
        fecha_vencimiento: '',
        estado: 'nueva',
        notas: ''
      });
    }
    setErrors({});
  }, [deudor, isOpen]);

  const handleInputChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateField = (field: keyof FormData, value: string): string | undefined => {
    switch (field) {
      case 'nombre':
        if (!value.trim()) return 'El nombre es obligatorio';
        if (value.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
        return undefined;

      case 'rut':
        if (value && !validarRUT(value)) return 'RUT inválido';
        return undefined;

      case 'email':
        if (value && !validarEmail(value)) return 'Email inválido';
        return undefined;

      case 'telefono':
        if (value && !validarTelefono(value)) return 'Teléfono inválido (8-9 dígitos o con prefijo +56)';
        return undefined;

      case 'monto_deuda':
        if (!value.trim()) return 'El monto es obligatorio';
        if (!validarMontoCLP(value)) return 'Formato de monto inválido (use números, puntos y comas)';
        const monto = parsearMontoCLP(value);
        if (monto <= 0) return 'El monto debe ser mayor a 0';
        return undefined;

      case 'fecha_vencimiento':
        // Permitir cualquier fecha (pasada, presente o futura)
        // Las deudas pueden haberse vencido hace tiempo y seguir siendo válidas
        return undefined;

      default:
        return undefined;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Validar campos obligatorios
    const requiredFields: (keyof FormData)[] = ['nombre', 'monto_deuda'];
    requiredFields.forEach(field => {
      const value = formData[field] || '';
      const error = validateField(field, value);
      if (error) {
        newErrors[field as keyof FormErrors] = error;
        isValid = false;
      }
    });

    // Validar campos opcionales
    const optionalFields: (keyof FormData)[] = ['rut', 'email', 'telefono', 'fecha_vencimiento'];
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

    setIsLoading(true);
    try {
      const dataToSave: CreateDeudorData = {
        nombre: formData.nombre.trim(),
        rut: formData.rut.trim() || undefined,
        email: formData.email.trim() || undefined,
        telefono: formData.telefono.trim() || undefined,
        monto_deuda: parsearMontoCLP(formData.monto_deuda),
        fecha_vencimiento: formData.fecha_vencimiento || undefined,
        estado: formData.estado
      };

      if (deudor) {
        // Modo edición
        await updateDeudor(deudor.id, dataToSave);
        toast.success('Deudor actualizado exitosamente');
      } else {
        // Modo agregar
        await createDeudor(dataToSave);
        toast.success('Deudor creado exitosamente');
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
              ? 'Modifica la información del deudor seleccionado.'
              : 'Completa la información del nuevo deudor. Los campos marcados con * son obligatorios.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <div>
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
                placeholder="juan@ejemplo.com"
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
                placeholder="912345678 o +56912345678"
                className={errors.telefono ? 'border-red-500' : ''}
              />
              {errors.telefono && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {errors.telefono}
                </div>
              )}
              {formData.telefono && !errors.telefono && validarTelefono(formData.telefono) && (
                <div className="flex items-center gap-1 mt-1 text-sm text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Teléfono válido: {formatearTelefono(formData.telefono)}
                </div>
              )}
            </div>

            {/* Monto deuda */}
            <div>
              <Label htmlFor="monto_deuda" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Monto de la deuda *
              </Label>
              <Input
                id="monto_deuda"
                type="text"
                value={formData.monto_deuda}
                onChange={(e) => handleInputChange('monto_deuda', e.target.value)}
                placeholder="1.500.000"
                className={errors.monto_deuda ? 'border-red-500' : ''}
              />
              {errors.monto_deuda && (
                <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {errors.monto_deuda}
                </div>
              )}
              {formData.monto_deuda && !errors.monto_deuda && (
                <div className="flex items-center gap-1 mt-1 text-sm text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Monto: {formatearMontoCLP(parsearMontoCLP(formData.monto_deuda))}
                </div>
              )}
            </div>

            {/* Fecha vencimiento */}
            <div>
              <Label htmlFor="fecha_vencimiento" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Fecha de vencimiento
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

            {/* Estado */}
            <div className="md:col-span-2">
              <Label htmlFor="estado">Estado de la deuda</Label>
              <Select value={formData.estado} onValueChange={(value) => handleInputChange('estado', value as Deudor['estado'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ESTADOS_DEUDA).map(([key, value]) => {
                    const config = ESTADOS_DEUDA_CONFIG[value as keyof typeof ESTADOS_DEUDA_CONFIG];
                    return (
                      <SelectItem key={key} value={value}>
                        <div className="flex items-center gap-2">
                          <span>{config.icon}</span>
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Notas */}
            <div className="md:col-span-2">
              <Label htmlFor="notas">Notas adicionales</Label>
              <Textarea
                id="notas"
                value={formData.notas}
                onChange={(e) => handleInputChange('notas', e.target.value)}
                placeholder="Información adicional sobre el deudor..."
                rows={3}
              />
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
