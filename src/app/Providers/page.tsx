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

// Interfaces ajustadas según el esquema de la base de datos
interface Proveedor {
  id: string; // Cambiado a string para UUID
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
  
    // Validar campos obligatorios según la base de datos
    if (!formData.nombre || !formData.cuit) {
      setFormError('Por favor, complete los campos obligatorios: Nombre y CUIT.');
      setIsSubmitting(false);
      return;
    }
  
    try {
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
      setFormData(initialFormState);
      setIsDialogOpen(false);
    } catch (error: unknown) {
      console.error('Error al agregar proveedor:', error);
    
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Error al agregar el proveedor. Por favor, intente nuevamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  useEffect(() => {
    const fetchProveedores = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Cargar proveedores
        const { data: proveedoresData, error: proveedoresError } = await supabase
          .from('proveedores')
          .select('*');
        
        if (proveedoresError) throw proveedoresError;
        setProveedores(proveedoresData || []);
        
        // Cargar tipos de IVA
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

  // Filtrar proveedores basado en la búsqueda
  const filteredProveedores = proveedores.filter(proveedor => 
    proveedor.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proveedor.cuit.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (proveedor.contacto && proveedor.contacto.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Función para obtener el nombre del tipo de IVA
  const getTipoIvaNombre = (tipoIvaId: string | null) => {
    if (!tipoIvaId) return "No especificado";
    const tipoIva = tiposIva.find(tipo => tipo.id === tipoIvaId);
    return tipoIva ? tipoIva.nombre : "No especificado";
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Proveedores</h2>
          <p className="text-sm text-slate-500">
            Administra los proveedores del sistema
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
  <DialogTrigger asChild>
    <Button variant="outline" className="bg-blue-500 text-white hover:bg-blue-600">
      <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
    </Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Nuevo Proveedor</DialogTitle>
      <DialogDescription>
        Complete los datos del nuevo proveedor
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleInputChange}
            placeholder="Ingrese el nombre del proveedor"
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
            <SelectTrigger>
              <SelectValue placeholder="Seleccione tipo de IVA" />
            </SelectTrigger>
            <SelectContent>
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
            placeholder="Ingrese el nombre de contacto"
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
            placeholder="Ingrese el número de teléfono"
            className="w-full"
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="direccion">Dirección</Label>
          <Input
            id="direccion"
            name="direccion"
            value={formData.direccion}
            onChange={handleInputChange}
            placeholder="Ingrese la dirección del proveedor"
            className="w-full"
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="observaciones">Observaciones</Label>
          <Textarea
            id="observaciones"
            name="observaciones"
            value={formData.observaciones}
            onChange={handleInputChange}
            placeholder="Ingrese cualquier observación adicional"
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
      <DialogFooter>
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => setIsDialogOpen(false)}
          className="mr-2"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-blue-500 text-white hover:bg-blue-600">
          {isSubmitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Guardar Proveedor
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
              className="max-w-sm"
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
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>CUIT</TableHead>
                    <TableHead>Tipo IVA</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Dirección</TableHead>
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
                        <TableCell>{proveedor.cuit}</TableCell>
                        <TableCell>{getTipoIvaNombre(proveedor.tipo_iva_id)}</TableCell>
                        <TableCell>{proveedor.contacto || "-"}</TableCell>
                        <TableCell>{proveedor.correo || "-"}</TableCell>
                        <TableCell>{proveedor.telefono || "-"}</TableCell>
                        <TableCell>{proveedor.direccion || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="mr-2 hover:bg-gray-200">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:bg-gray-200">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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