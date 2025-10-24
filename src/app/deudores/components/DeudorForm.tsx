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
  validarRUT, 
  validarEmail, 
  validarTelefono,
  formatearRUT,
  formatearTelefono,
  normalizarRUT
} from '@/lib/database';
import { supabase } from '@/lib/supabase';
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
}

interface FormErrors {
  nombre?: string;
  rut?: string;
}

export function DeudorForm({ isOpen, onClose, onSuccess, deudor }: DeudorFormProps) {
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    rut: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Precargar datos si es modo edición
  useEffect(() => {
    if (deudor && isOpen) {
      setFormData({
        nombre: deudor.nombre || '',
        rut: deudor.rut || ''
      });
    } else if (isOpen) {
      // Resetear formulario para modo agregar
      setFormData({
        nombre: '',
        rut: ''
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

      default:
        return undefined;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Validar campos obligatorios
    const requiredFields: (keyof FormData)[] = ['nombre'];
    requiredFields.forEach(field => {
      const value = formData[field] || '';
      const error = validateField(field, value);
      if (error) {
        newErrors[field as keyof FormErrors] = error;
        isValid = false;
      }
    });

    // Validar campos opcionales
    const optionalFields: (keyof FormData)[] = ['rut'];
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
      const dataToSave = {
        nombre: formData.nombre.trim(),
        rut: formData.rut.trim() ? normalizarRUT(formData.rut.trim()) : undefined
      };

      if (deudor) {
        // Modo edición
        const { error } = await supabase
          .from('deudores')
          .update(dataToSave)
          .eq('id', deudor.id);
        
        if (error) throw error;
        toast.success('Deudor actualizado exitosamente');
      } else {
        // Modo agregar - necesitamos el usuario_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { error } = await supabase
          .from('deudores')
          .insert({
            ...dataToSave,
            usuario_id: user.id
          });
        
        if (error) throw error;
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
              ? 'Modifica la información básica del deudor seleccionado.'
              : 'Completa la información básica del nuevo deudor. Los contactos y deudas se pueden agregar después.'
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
