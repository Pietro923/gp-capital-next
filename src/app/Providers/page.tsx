"use client"
import React, { useState } from 'react';
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
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";

interface Provider {
  id: number;
  name: string;
  brand: string;
  contact: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
}

const Providers: React.FC = () => {
  const [providers] = useState<Provider[]>([
    {
      id: 1,
      name: "Pueble",
      brand: "Case",
      contact: "Juan Pueble",
      email: "contacto@pueble.com",
      phone: "11-1234-5678",
      status: 'active'
    },
    {
      id: 2,
      name: "Semage",
      brand: "Repuestos Generales",
      contact: "María Semage",
      email: "contacto@semage.com",
      phone: "11-2345-6789",
      status: 'active'
    },
    {
      id: 3,
      name: "Magi",
      brand: "Ducati",
      contact: "Carlos Magi",
      email: "contacto@magi.com",
      phone: "11-3456-7890",
      status: 'active'
    },
    {
      id: 4,
      name: "ub.ti",
      brand: "Audi",
      contact: "Roberto Ubti",
      email: "contacto@ubti.com",
      phone: "11-4567-8901",
      status: 'active'
    },
    {
      id: 5,
      name: "Cpm",
      brand: "Kia",
      contact: "Ana Cpm",
      email: "contacto@cpm.com",
      phone: "11-5678-9012",
      status: 'active'
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Proveedores</h2>
          <p className="text-sm text-slate-500">
            Administra las empresas del Grupo Pueble
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      <Card>
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
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell className="font-medium">{provider.name}</TableCell>
                  <TableCell>{provider.brand}</TableCell>
                  <TableCell>{provider.contact}</TableCell>
                  <TableCell>{provider.email}</TableCell>
                  <TableCell>{provider.phone}</TableCell>
                  <TableCell>
                    <Badge variant={provider.status === 'active' ? 'default' : 'secondary'}>
                      {provider.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="mr-2">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Providers;