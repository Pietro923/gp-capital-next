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
import { Search, Download } from "lucide-react";
import { supabase } from '@/utils/supabase/server';

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
  dni: string;
  created_at: string;
}

interface ExcelRow {
  [key: string]: string | number;
}

const ClientList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientes = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
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

    fetchClientes();
  }, []);

  const filteredClientes = clientes
    .filter(cliente =>
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.dni.includes(searchTerm)
    );

  const exportToExcel = () => {
    const excelData: ExcelRow[] = filteredClientes.map(cliente => ({
      'Nombre': cliente.nombre,
      'Apellido': cliente.apellido,
      'Correo': cliente.correo || '',
      'Teléfono': cliente.telefono || '',
      'Dirección': cliente.direccion || '',
      'DNI': cliente.dni,
      'Fecha de Registro': new Date(cliente.created_at).toLocaleDateString('es-AR')
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
                  placeholder="Buscar por nombre, apellido o DNI..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Apellido</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Fecha de Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id} className="cursor-pointer hover:bg-slate-50">
                      <TableCell className="font-medium">{cliente.nombre}</TableCell>
                      <TableCell>{cliente.apellido}</TableCell>
                      <TableCell>{cliente.correo}</TableCell>
                      <TableCell>{cliente.telefono}</TableCell>
                      <TableCell>{cliente.direccion}</TableCell>
                      <TableCell>{cliente.dni}</TableCell>
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