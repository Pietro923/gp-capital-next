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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Listado de Clientes</CardTitle>
          <div className="flex space-x-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <User className="mr-2 h-4 w-4" /> Nuevo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
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
                      Persona Física
                    </TabsTrigger>
                    <TabsTrigger value="EMPRESA" className="flex items-center">
                      <Building className="mr-2 h-4 w-4" />
                      Empresa
                    </TabsTrigger>
                  </TabsList>

                  <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <TabsContent value="PERSONA_FISICA">
                      <div className="grid grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
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
                      <div className="col-span-2 space-y-2">
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

                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Guardar Cliente
                      </Button>
                    </DialogFooter>
                  </form>
                </Tabs>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="mr-2 h-4 w-4" /> Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre, apellido, DNI, CUIT o empresa..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Apellido</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>CUIT</TableHead>
                    <TableHead>Condición IVA</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Fecha Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id} className="cursor-pointer hover:bg-slate-50">
                      <TableCell>
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
                      <TableCell className="font-medium">{cliente.nombre}</TableCell>
                      <TableCell>{cliente.apellido}</TableCell>
                      <TableCell>{cliente.empresa}</TableCell>
                      <TableCell>{cliente.dni}</TableCell>
                      <TableCell>{cliente.cuit}</TableCell>
                      <TableCell>{cliente.tipo_iva?.nombre || ''}</TableCell>
                      <TableCell>{cliente.correo}</TableCell>
                      <TableCell>{cliente.telefono}</TableCell>
                      <TableCell>{cliente.direccion}</TableCell>
                      <TableCell>
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