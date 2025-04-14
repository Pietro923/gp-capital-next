"use client"
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from '@/utils/supabase/client';
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Proveedor {
  id: string;
  nombre: string;
  cuit: string;
  tipo_iva_id: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  contacto: string | null;
  observaciones: string | null;
  created_at: string;
}

interface TipoIva {
  id: string;
  nombre: string;
}

interface ProveedorFormData {
  id?: string;
  nombre: string;
  cuit: string;
  tipo_iva_id: string | null;
  direccion: string;
  telefono: string;
  correo: string;
  contacto: string;
  observaciones: string;
}

const initialFormState: ProveedorFormData = {
  nombre: '',
  cuit: '',
  tipo_iva_id: null,
  direccion: '',
  telefono: '',
  correo: '',
  contacto: '',
  observaciones: ''
};

const Providers: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [tiposIva, setTiposIva] = useState<TipoIva[]>([]);
  const [formData, setFormData] = useState<ProveedorFormData>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    if (!formData.nombre || !formData.cuit) {
      setFormError('Por favor, complete los campos obligatorios: Nombre y CUIT.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (isEditing && formData.id) {
        // Actualizar proveedor existente
        const { data, error } = await supabase
          .from('proveedores')
          .update({
            nombre: formData.nombre,
            cuit: formData.cuit,
            tipo_iva_id: formData.tipo_iva_id,
            direccion: formData.direccion || null,
            telefono: formData.telefono || null,
            correo: formData.correo || null,
            contacto: formData.contacto || null,
            observaciones: formData.observaciones || null
          })
          .eq('id', formData.id)
          .select();

        if (error) throw error;

        if (data) {
          setProveedores(prev => prev.map(p => p.id === formData.id ? data[0] : p));
        }
      } else {
        // Crear nuevo proveedor
        const { data, error } = await supabase
          .from('proveedores')
          .insert([{
            nombre: formData.nombre,
            cuit: formData.cuit,
            tipo_iva_id: formData.tipo_iva_id,
            direccion: formData.direccion || null,
            telefono: formData.telefono || null,
            correo: formData.correo || null,
            contacto: formData.contacto || null,
            observaciones: formData.observaciones || null
          }])
          .select();

        if (error) throw error;

        if (data) {
          setProveedores(prev => [...prev, data[0]]);
        }
      }
      
      setFormData(initialFormState);
      setIsDialogOpen(false);
      setIsEditing(false);
    } catch (error: unknown) {
      console.error('Error al guardar proveedor:', error);
    
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Error al guardar el proveedor. Por favor, intente nuevamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (proveedor: Proveedor) => {
    setFormData({
      id: proveedor.id,
      nombre: proveedor.nombre,
      cuit: proveedor.cuit,
      tipo_iva_id: proveedor.tipo_iva_id,
      direccion: proveedor.direccion || '',
      telefono: proveedor.telefono || '',
      correo: proveedor.correo || '',
      contacto: proveedor.contacto || '',
      observaciones: proveedor.observaciones || ''
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('proveedores')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setProveedores(prev => prev.filter(p => p.id !== deleteId));
      setDeleteId(null);
    } catch (error: unknown) {
      console.error('Error al eliminar proveedor:', error);
    
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Error al eliminar el proveedor. Por favor, intente nuevamente.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const fetchProveedores = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: proveedoresData, error: proveedoresError } = await supabase
          .from('proveedores')
          .select('*');
        
        if (proveedoresError) throw proveedoresError;
        setProveedores(proveedoresData || []);
        
        const { data: tiposIvaData, error: tiposIvaError } = await supabase
          .from('tipos_iva')
          .select('*');
        
        if (tiposIvaError) throw tiposIvaError;
        setTiposIva(tiposIvaData || []);
        
      } catch (error: unknown) {
        console.error('Error fetching data:', error);
      
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Error al cargar los datos');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProveedores();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      tipo_iva_id: value
    }));
  };

  const filteredProveedores = proveedores.filter(proveedor => 
    proveedor.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proveedor.cuit.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (proveedor.contacto && proveedor.contacto.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getTipoIvaNombre = (tipoIvaId: string | null) => {
    if (!tipoIvaId) return "No especificado";
    const tipoIva = tiposIva.find(tipo => tipo.id === tipoIvaId);
    return tipoIva ? tipoIva.nombre : "No especificado";
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Gestión de Proveedores</h2>
          <p className="text-sm text-slate-500">
            Administra los proveedores del sistema
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="bg-blue-500 text-white hover:bg-blue-600 w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-w-[95vw] p-3 sm:p-6 overflow-y-auto max-h-[90vh]">
            <DialogHeader className="mb-2">
              <DialogTitle>{isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
              <DialogDescription>
                {isEditing ? 'Modifique los datos del proveedor' : 'Complete los datos del nuevo proveedor'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    placeholder="Nombre del proveedor"
                    className="w-full"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuit">CUIT *</Label>
                  <Input
                    id="cuit"
                    name="cuit"
                    value={formData.cuit}
                    onChange={handleInputChange}
                    placeholder="XX-XXXXXXXX-X"
                    className="w-full"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_iva_id">Tipo IVA</Label>
                  <Select 
                    onValueChange={handleSelectChange} 
                    value={formData.tipo_iva_id || ""}
                  >
                    <SelectTrigger id="tipo_iva_id" className="w-full">
                      <SelectValue placeholder="Seleccione tipo" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-full">
                      {tiposIva.map(tipo => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contacto">Persona de Contacto</Label>
                  <Input
                    id="contacto"
                    name="contacto"
                    value={formData.contacto}
                    onChange={handleInputChange}
                    placeholder="Nombre de contacto"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="correo">Correo</Label>
                  <Input
                    id="correo"
                    name="correo"
                    type="email"
                    value={formData.correo}
                    onChange={handleInputChange}
                    placeholder="correo@ejemplo.com"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    placeholder="Número de teléfono"
                    className="w-full"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleInputChange}
                    placeholder="Dirección del proveedor"
                    className="w-full"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleInputChange}
                    placeholder="Observaciones adicionales"
                    className="w-full"
                    rows={3}
                  />
                </div>
              </div>
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-2 mt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  className="w-full sm:w-auto sm:mr-2"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="bg-blue-500 text-white hover:bg-blue-600 w-full sm:w-auto"
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Proveedores
          </CardTitle>
          <CardDescription>
            Lista de proveedores registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <Input 
              placeholder="Buscar proveedor..." 
              className="w-full max-w-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden sm:table-cell">CUIT</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo IVA</TableHead>
                    <TableHead className="hidden md:table-cell">Contacto</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
                    <TableHead className="hidden xl:table-cell">Dirección</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProveedores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No se encontraron proveedores
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProveedores.map((proveedor) => (
                      <TableRow key={proveedor.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium">{proveedor.nombre}</TableCell>
                        <TableCell className="hidden sm:table-cell">{proveedor.cuit}</TableCell>
                        <TableCell className="hidden md:table-cell">{getTipoIvaNombre(proveedor.tipo_iva_id)}</TableCell>
                        <TableCell className="hidden md:table-cell">{proveedor.contacto || "-"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{proveedor.correo || "-"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{proveedor.telefono || "-"}</TableCell>
                        <TableCell className="hidden xl:table-cell">{proveedor.direccion || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="hover:bg-gray-200"
                              onClick={() => handleEdit(proveedor)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="hover:bg-gray-200 hover:text-red-500"
                                  onClick={() => setDeleteId(proveedor.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Confirmar eliminación</DialogTitle>
                                  <DialogDescription>
                                    ¿Está seguro que desea eliminar al proveedor {proveedor.nombre}?
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => setDeleteId(null)}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                  >
                                    {isDeleting && (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Eliminar
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Providers;