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
import { Badge } from "@/components/ui/badge";
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
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Provider {
  status: string;
  id: number;
  marca: string;
  contacto: string | number | readonly string[] | undefined;
  nombre: string;
  correo: string;
  telefono: string;
  direc: string;
}
interface NewProviderForm {
  marca: string;
  contacto: string | number | readonly string[] | undefined;
  nombre: string;
  correo: string;
  telefono: string;
  direc: string;
}

const initialFormState: NewProviderForm = {
  nombre: '',
  correo: '',
  telefono: '',
  direc: '',
  marca: '',
  contacto: '',
};

const Providers: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [Providers, setProviders] = useState<Provider[]>([]);
  const [formData, setFormData] = useState<NewProviderForm>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setIsLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
  
    // Validar que todos los campos obligatorios estén llenos
    if (
      !formData.nombre ||
      !formData.marca ||
      !formData.contacto ||
      !formData.correo ||
      !formData.telefono ||
      !formData.direc
    ) {
      setFormError('Por favor, complete todos los campos antes de guardar.');
      setIsSubmitting(false);
      return; // Detener la ejecución si falta algún campo
    }
  
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .insert([
          {
            ...formData,
          }
        ])
        .select();
  
      if (error) throw error;
  
      setProviders(prev => [...prev, data[0]]);
      setFormData(initialFormState);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error al agregar proveedor:', error);
      setFormError('Error al agregar el proveedor. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  useEffect(() => {
    const fetchProveedores = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('proveedores')
          .select('*')

        if (error) {
          throw error;
        }

        setProviders(data || []);
      } catch (error) {
        console.error('Error fetching proveedores:', error);
        setError('Error al cargar los proveedores');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProveedores();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Proveedores</h2>
          <p className="text-sm text-slate-500">
            Administra las empresas del Grupo Pueble
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
                Complete los datos del Nuevo Proveedor
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    name="marca"
                    value={formData.marca}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contacto">Contacto</Label>
                  <Input
                    id="contacto"
                    name="contacto"
                    value={formData.contacto}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="correo">Correo</Label>
                  <Input
                    id="correo"
                    name="correo"
                    type="email"
                    value={formData.correo}
                    onChange={handleInputChange}
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
                    className="w-full"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="direc">Dirección</Label>
                  <Input
                    id="direc"
                    name="direc"
                    value={formData.direc}
                    onChange={handleInputChange}
                    className="w-full"
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
                  Guardar Cliente
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
            Proveedores Activos
          </CardTitle>
          <CardDescription>
            Lista de empresas asociadas y sus marcas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <Input 
              placeholder="Buscar proveedor..." 
              className="max-w-sm"
            />
          </div>
          
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Providers.map((provider) => (
                  <TableRow key={provider.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium">{provider.nombre}</TableCell>
                    <TableCell>{provider.marca}</TableCell>
                    <TableCell>{provider.contacto}</TableCell>
                    <TableCell>{provider.correo}</TableCell>
                    <TableCell>{provider.telefono}</TableCell>
                    <TableCell>{provider.direc}</TableCell>
                    <TableCell>
                      <Badge variant={provider.status === 'active' ? 'default' : 'secondary'}>
                        {provider.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-2 hover:bg-gray-200">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:bg-gray-200">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Providers;