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
import { Search, Download, User, Loader2, Building, UserCheck } from "lucide-react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const { error } = await supabase
        .from('clientes')
        .insert([
          {
            ...formData,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      // Refetch clients to get the complete data with joins
      await fetchClientes();
      setFormData(initialFormState);
      setIsDialogOpen(false);
    } catch (error: unknown) {
      console.error('Error al agregar cliente:', error);
    
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Error al agregar el cliente. Por favor, intente nuevamente.');
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
                <Button variant="outline" className="w-full">
                  <User className="mr-2 h-4 w-4" /> Nuevo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4">
                <DialogHeader>
                  <DialogTitle>Nuevo Cliente</DialogTitle>
                  <DialogDescription>
                    Complete los datos del nuevo cliente
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
                            required
                            value={formData.nombre}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="apellido">Apellido</Label>
                          <Input
                            id="apellido"
                            name="apellido"
                            required
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
                            required
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
                            required
                            value={formData.empresa}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nombre">Nombre Contacto</Label>
                          <Input
                            id="nombre"
                            name="nombre"
                            required
                            value={formData.nombre}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="apellido">Apellido Contacto</Label>
                          <Input
                            id="apellido"
                            name="apellido"
                            required
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
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cuit">CUIT Empresa</Label>
                          <Input
                            id="cuit"
                            name="cuit"
                            required
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
                        Guardar Cliente
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
                <div key={cliente.id} className="border rounded-md p-4 mb-4 cursor-pointer hover:bg-slate-50">
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
                </div>
              ))}
            </div>
            
            {/* Desktop view: Table layout */}
            <div className="hidden md:block rounded-md border overflow-auto">
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id} className="cursor-pointer hover:bg-slate-50">
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientList;