"use client";
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, User, Loader2, Building, UserCheck, Pencil, Trash2 } from "lucide-react";
import { supabase } from '@/utils/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface TipoIVA {
  id: string;
  nombre: string;
}

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
  dni: string;
  empresa: string | null;
  tipo_cliente: 'PERSONA_FISICA' | 'EMPRESA';
  cuit: string | null;
  tipo_iva_id: string | null;
  tipo_iva: TipoIVA | null;
  created_at: string;
}

interface ExcelRow {
  [key: string]: string | number;
}

interface NewClientForm {
  tipo_cliente: 'PERSONA_FISICA' | 'EMPRESA';
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  direccion: string;
  dni: string;
  empresa: string;
  cuit: string;
  tipo_iva_id: string;
}

const initialFormState: NewClientForm = {
  tipo_cliente: 'PERSONA_FISICA',
  nombre: '',
  apellido: '',
  correo: '',
  telefono: '',
  direccion: '',
  dni: '',
  empresa: '',
  cuit: '',
  tipo_iva_id: '',
};

const ClientList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tiposIVA, setTiposIVA] = useState<TipoIVA[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<NewClientForm>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PERSONA_FISICA' | 'EMPRESA'>('PERSONA_FISICA');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'PERSONA_FISICA' | 'EMPRESA');
    setFormData(prev => ({
      ...prev,
      tipo_cliente: value as 'PERSONA_FISICA' | 'EMPRESA'
    }));
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setSelectedClientId(null);
    setFormError(null);
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEditClient = (cliente: Cliente) => {
    
    const editForm: NewClientForm = {
      tipo_cliente: cliente.tipo_cliente,
      nombre: cliente.nombre || '',
      apellido: cliente.apellido || '',
      correo: cliente.correo || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      dni: cliente.dni || '',
      empresa: cliente.empresa || '',
      cuit: cliente.cuit || '',
      tipo_iva_id: cliente.tipo_iva_id || '',
    };
    
    setFormData(editForm);
    setActiveTab(cliente.tipo_cliente);
    setIsEditing(true);
    setSelectedClientId(cliente.id);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clientToDelete.id);
        
      if (error) throw error;
      
      // Actualizar la lista de clientes
      setClientes(prevClientes => 
        prevClientes.filter(c => c.id !== clientToDelete.id)
      );
      
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      // Mostrar error
    }
  };
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
  
    // Validaciones dinámicas
    const errores: string[] = [];
  
    if (!formData.dni) {
      errores.push("El DNI es obligatorio.");
    }
  
    if (!formData.tipo_iva_id) {
      errores.push("La condición frente al IVA es obligatoria.");
    }
  
    if (activeTab === "EMPRESA") {
      if (!formData.empresa) errores.push("El nombre de la empresa es obligatorio.");
    }
  
    if (activeTab === "PERSONA_FISICA") {
      if (!formData.nombre) errores.push("El nombre es obligatorio.");
    }
  
    if (errores.length > 0) {
      setFormError(errores.join(" "));
      setIsSubmitting(false);
      return;
    }
  
    try {
      // Verificación de DNI duplicado al crear nuevo cliente
      if (!isEditing) {
        const { data: dniExistente, error: dniError } = await supabase
          .from("clientes")
          .select("id")
          .eq("dni", formData.dni)
          .single();
  
        if (dniExistente) {
          setFormError("El DNI ya está en uso.");
          setIsSubmitting(false);
          return;
        }
  
        if (dniError && dniError.code !== "PGRST116") {
          // PGRST116 es "No rows found" en modo single
          throw dniError;
        }
      }
  
      if (isEditing && selectedClientId) {
        const { error } = await supabase
          .from("clientes")
          .update({
            ...formData,
          })
          .eq("id", selectedClientId);
  
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("clientes")
          .insert([
            {
              ...formData,
              created_at: new Date().toISOString(),
            },
          ]);
  
        if (error) throw error;
      }
  
      await fetchClientes();
      resetForm();
      setIsDialogOpen(false);
    } catch (error: unknown) {
      console.error("Error al guardar cliente:", error);
  
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("Error al guardar el cliente. Por favor, intente nuevamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  

  const fetchTiposIVA = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_iva')
        .select('*')
        .order('nombre');
      if (error) throw error;
      setTiposIVA(data || []);
    } catch (error) {
      console.error('Error fetching tipos IVA:', error);
    }
  };

  const fetchClientes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          *,
          tipo_iva:tipos_iva(id, nombre)
        `)
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
      setError('Error al cargar los clientes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
    fetchTiposIVA();
  }, []);

  const filteredClientes = clientes
    .filter(cliente =>
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.dni.includes(searchTerm) ||
      (cliente.cuit && cliente.cuit.includes(searchTerm)) ||
      (cliente.empresa && cliente.empresa.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const exportToExcel = () => {
    const excelData: ExcelRow[] = filteredClientes.map(cliente => ({
      'Tipo': cliente.tipo_cliente === 'PERSONA_FISICA' ? 'Persona Física' : 'Empresa',
      'Nombre': cliente.nombre,
      'Apellido': cliente.apellido,
      'Empresa': cliente.empresa || '',
      'DNI': cliente.dni,
      'CUIT': cliente.cuit || '',
      'Condición IVA': cliente.tipo_iva?.nombre || '',
      'Correo': cliente.correo || '',
      'Teléfono': cliente.telefono || '',
      'Dirección': cliente.direccion || '',
      'Fecha de Registro': new Date(cliente.created_at).toLocaleDateString('es-AR'),
    }));
    
    let csvContent = '\ufeff';
    const headers = Object.keys(excelData[0]);
    csvContent += headers.join(';') + '\n';
    
    excelData.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvContent += values.join(';') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Cargando clientes...</div>;
  }

  if (error) {
    return <div className="text-red-600 p-4">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col items-start pb-4">
          <CardTitle className="mb-4">Listado de Clientes</CardTitle>
          <div className="flex flex-col space-y-2 w-full">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" onClick={handleOpenDialog}>
                  <User className="mr-2 h-4 w-4" /> Nuevo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4">
                <DialogHeader>
                  <DialogTitle>{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
                  <DialogDescription>
                    {isEditing ? 'Modifique los datos del cliente' : 'Complete los datos del nuevo cliente'}
                  </DialogDescription>
                </DialogHeader>
                <Tabs 
                  value={activeTab} 
                  onValueChange={handleTabChange}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="PERSONA_FISICA" className="flex items-center">
                      <UserCheck className="mr-2 h-4 w-4" />
                      <span className="text-xs sm:text-sm">Persona</span>
                    </TabsTrigger>
                    <TabsTrigger value="EMPRESA" className="flex items-center">
                      <Building className="mr-2 h-4 w-4" />
                      <span className="text-xs sm:text-sm">Empresa</span>
                    </TabsTrigger>
                  </TabsList>
                  <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <TabsContent value="PERSONA_FISICA">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nombre">Nombre</Label>
                          <Input
                            id="nombre"
                            name="nombre"
                            
                            value={formData.nombre}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="apellido">Apellido</Label>
                          <Input
                            id="apellido"
                            name="apellido"
                            
                            value={formData.apellido}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dni">DNI</Label>
                          <Input
                            id="dni"
                            name="dni"
                            required
                            value={formData.dni}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cuit">CUIT</Label>
                          <Input
                            id="cuit"
                            name="cuit"
                            
                            value={formData.cuit}
                            onChange={handleInputChange}
                            placeholder="XX-XXXXXXXX-X"
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="EMPRESA">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="empresa">Nombre de Empresa</Label>
                          <Input
  id="empresa"
  name="empresa"
  value={formData.empresa}
  onChange={handleInputChange}
  required={activeTab === "EMPRESA"} // solo requerido si es empresa
/>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nombre">Nombre Contacto</Label>
                          <Input
                            id="nombre"
                            name="nombre"
                            
                            value={formData.nombre}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="apellido">Apellido Contacto</Label>
                          <Input
                            id="apellido"
                            name="apellido"
                            
                            value={formData.apellido}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dni">DNI Contacto</Label>
                          <Input
                            id="dni"
                            name="dni"
                            value={formData.dni}
                            required={activeTab === "EMPRESA"} // solo requerido si es empresa
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cuit">CUIT Empresa</Label>
                          <Input
                            id="cuit"
                            name="cuit"
                            
                            value={formData.cuit}
                            onChange={handleInputChange}
                            placeholder="XX-XXXXXXXX-X"
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    {/* Campos comunes para ambos tipos */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tipo_iva_id">Condición frente al IVA</Label>
                        <Select 
                          value={formData.tipo_iva_id} 
                          onValueChange={(value) => handleSelectChange('tipo_iva_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar condición" />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposIVA.map((tipo) => (
                              <SelectItem key={tipo.id} value={tipo.id}>
                                {tipo.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="telefono">Teléfono</Label>
                        <Input
                          id="telefono"
                          name="telefono"
                          type="tel"
                          value={formData.telefono}
                          onChange={handleInputChange}
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
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="direccion">Dirección</Label>
                        <Input
                          id="direccion"
                          name="direccion"
                          value={formData.direccion}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    {formError && (
                      <Alert variant="destructive">
                        <AlertDescription>{formError}</AlertDescription>
                      </Alert>
                    )}
                    
                    <DialogFooter className="flex flex-col gap-2">
                      <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isEditing ? 'Guardar Cambios' : 'Guardar Cliente'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                        className="w-full"
                      >
                        Cancelar
                      </Button>
                    </DialogFooter>
                  </form>
                </Tabs>
              </DialogContent>
            </Dialog>
            
            {/* Dialog de confirmación para eliminar */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Confirmar eliminación</DialogTitle>
                  <DialogDescription>
                    ¿Está seguro que desea eliminar al cliente {clientToDelete?.nombre} {clientToDelete?.apellido}
                    {clientToDelete?.empresa ? ` (${clientToDelete.empresa})` : ''}?
                    Esta acción no se puede deshacer.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(false)}
                    className="sm:order-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteConfirm}
                    className="sm:order-2"
                  >
                    Eliminar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" onClick={exportToExcel} className="w-full">
              <Download className="mr-2 h-4 w-4" /> Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre, apellido, DNI, CUIT o Empresa..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Mobile view: Card-based layout */}
            <div className="block md:hidden">
              {filteredClientes.map((cliente) => (
                <div key={cliente.id} className="border rounded-md p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-sm">
                      {cliente.tipo_cliente === 'PERSONA_FISICA' ? (
                        <span className="flex items-center">
                          <UserCheck className="mr-1 h-4 w-4" /> Persona
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Building className="mr-1 h-4 w-4" /> Empresa
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(cliente.created_at).toLocaleDateString('es-AR')}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="grid grid-cols-2 gap-1">
                      <div className="text-xs font-semibold">Nombre:</div>
                      <div className="text-xs">{cliente.nombre}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1">
                      <div className="text-xs font-semibold">Apellido:</div>
                      <div className="text-xs">{cliente.apellido}</div>
                    </div>
                    
                    {cliente.empresa && (
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-xs font-semibold">Empresa:</div>
                        <div className="text-xs">{cliente.empresa}</div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-1">
                      <div className="text-xs font-semibold">DNI:</div>
                      <div className="text-xs">{cliente.dni}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1">
                      <div className="text-xs font-semibold">CUIT:</div>
                      <div className="text-xs">{cliente.cuit}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1">
                      <div className="text-xs font-semibold">IVA:</div>
                      <div className="text-xs">{cliente.tipo_iva?.nombre || ''}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1">
                      <div className="text-xs font-semibold">Correo:</div>
                      <div className="text-xs">{cliente.correo}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1">
                      <div className="text-xs font-semibold">Teléfono:</div>
                      <div className="text-xs">{cliente.telefono}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1">
                      <div className="text-xs font-semibold">Dirección:</div>
                      <div className="text-xs">{cliente.direccion}</div>
                    </div>
                  </div>
                  
                  {/* Acciones en móvil */}
                  <div className="flex justify-end gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-2"
                      onClick={() => handleEditClient(cliente)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-2 text-red-500 hover:text-red-700"
                      onClick={() => {
                        setClientToDelete(cliente);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop view: Table layout */}
            <div className="hidden md:block rounded-md border overflow-auto">
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto"> {/* Añade esta línea */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Tipo</TableHead>
                    <TableHead className="whitespace-nowrap">Nombre</TableHead>
                    <TableHead className="whitespace-nowrap">Apellido</TableHead>
                    <TableHead className="whitespace-nowrap">Empresa</TableHead>
                    <TableHead className="whitespace-nowrap">DNI</TableHead>
                    <TableHead className="whitespace-nowrap">CUIT</TableHead>
                    <TableHead className="whitespace-nowrap">Condición IVA</TableHead>
                    <TableHead className="whitespace-nowrap">Correo</TableHead>
                    <TableHead className="whitespace-nowrap">Teléfono</TableHead>
                    <TableHead className="whitespace-nowrap">Dirección</TableHead>
                    <TableHead className="whitespace-nowrap">Fecha Registro</TableHead>
                    <TableHead className="whitespace-nowrap">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="whitespace-nowrap">
                        {cliente.tipo_cliente === 'PERSONA_FISICA' ? (
                          <span className="flex items-center">
                            <UserCheck className="mr-1 h-4 w-4" /> Persona
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <Building className="mr-1 h-4 w-4" /> Empresa
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{cliente.nombre}</TableCell>
                      <TableCell className="whitespace-nowrap">{cliente.apellido}</TableCell>
                      <TableCell className="whitespace-nowrap">{cliente.empresa}</TableCell>
                      <TableCell className="whitespace-nowrap">{cliente.dni}</TableCell>
                      <TableCell className="whitespace-nowrap">{cliente.cuit}</TableCell>
                      <TableCell className="whitespace-nowrap">{cliente.tipo_iva?.nombre || ''}</TableCell>
                      <TableCell className="whitespace-nowrap">{cliente.correo}</TableCell>
                      <TableCell className="whitespace-nowrap">{cliente.telefono}</TableCell>
                      <TableCell className="whitespace-nowrap max-w-[200px] truncate">{cliente.direccion}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(cliente.created_at).toLocaleDateString('es-AR')}
                      </TableCell>
                      <TableCell>
                      
                      <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-2 mr-2"
                      onClick={() => handleEditClient(cliente)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-2 text-red-500 hover:text-red-700"
                      onClick={() => {
                        setClientToDelete(cliente);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientList;