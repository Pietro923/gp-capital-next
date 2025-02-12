"use client";

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/utils/supabase/client';

// Interfaces actualizadas según el esquema de Supabase
interface Cliente {
  id: string; // UUID
  nombre: string;
  apellido: string;
  dni: string;
}

interface Cuota {
  id: string; // UUID
  prestamo_id: string; // UUID
  numero_cuota: number;
  monto: number;
  fecha_vencimiento: string;
  fecha_pago: string | null;
  estado: 'PENDIENTE' | 'PAGADO' | 'VENCIDO';
}

interface Prestamo {
  id: string; // UUID
  cliente_id: string; // UUID
  monto_total: number;
  tasa_interes: number;
  cantidad_cuotas: number;
  estado: 'ACTIVO' | 'CANCELADO' | 'COMPLETADO';
  fecha_inicio: string;
}

interface PrestamoConCuotas extends Prestamo {
  cliente: Cliente;
  cuotas: Cuota[];
  cuotas_pagadas: number;
}

interface ExcelRow {
  Cliente: string;
  DNI: string;
  'Número de Cuota': number;
  'Fecha Vencimiento': string;
  'Monto': number;
  'Estado': string;
  'Fecha Pago': string;
  'Tasa Interés': number;
}

const LoanDetails = () => {
  const [prestamos, setPrestamos] = useState<PrestamoConCuotas[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPrestamos, setExpandedPrestamos] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // TODO: Reemplazar con tu cliente de Supabase
        const { data: prestamosData, error: prestamosError } = await supabase
          .from('prestamos')
          .select(`
            *,
            cliente:clientes(*),
            cuotas(*)
          `)
          .order('fecha_inicio', { ascending: false });

        if (prestamosError) throw prestamosError;

        const prestamosProcessed: PrestamoConCuotas[] = prestamosData.map(prestamo => ({
          ...prestamo,
          cuotas_pagadas: prestamo.cuotas.filter((c: { estado: string; }) => c.estado === 'PAGADO').length
        }));

        setPrestamos(prestamosProcessed);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los datos de préstamos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getEstadoColor = (estado: Cuota['estado']) => {
    switch (estado) {
      case 'PAGADO':
        return 'text-green-600 bg-green-100';
      case 'VENCIDO':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const filteredPrestamos = prestamos.filter(prestamo =>
    `${prestamo.cliente.nombre} ${prestamo.cliente.apellido}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const exportToExcel = () => {
    const excelData: ExcelRow[] = filteredPrestamos.flatMap(prestamo => 
      prestamo.cuotas.map(cuota => ({
        'Cliente': `${prestamo.cliente.nombre} ${prestamo.cliente.apellido}`,
        'DNI': prestamo.cliente.dni,
        'Número de Cuota': cuota.numero_cuota,
        'Fecha Vencimiento': new Date(cuota.fecha_vencimiento).toLocaleDateString('es-AR'),
        'Monto': cuota.monto,
        'Estado': cuota.estado,
        'Fecha Pago': cuota.fecha_pago ? new Date(cuota.fecha_pago).toLocaleDateString('es-AR') : '',
        'Tasa Interés': prestamo.tasa_interes
      }))
    );

    let csvContent = '\ufeff';
    const headers = Object.keys(excelData[0]) as (keyof ExcelRow)[];
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
    link.setAttribute('download', `prestamos_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="flex justify-center p-4">Cargando...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const toggleExpanded = (prestamoId: string) => {
    setExpandedPrestamos(prev => 
      prev.includes(prestamoId) 
        ? prev.filter(id => id !== prestamoId)
        : [...prev, prestamoId]
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Detalle de Préstamos y Cuotas</CardTitle>
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por cliente..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {filteredPrestamos.some(p => p.cuotas.some(c => c.estado === 'VENCIDO')) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Hay cuotas vencidas que requieren atención inmediata.
                </AlertDescription>
              </Alert>
            )}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead className="text-right">Monto Total</TableHead>
                    <TableHead className="text-right">Cuotas Pagadas</TableHead>
                    <TableHead>Progreso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrestamos.map(prestamo => (
                    <React.Fragment key={prestamo.id}>
                      <TableRow 
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => toggleExpanded(prestamo.id)}
                      >
                        <TableCell>
                          {expandedPrestamos.includes(prestamo.id) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="font-medium">
                          {`${prestamo.cliente.nombre} ${prestamo.cliente.apellido}`}
                        </TableCell>
                        <TableCell>{prestamo.cliente.dni}</TableCell>
                        <TableCell className="text-right">
                          ${prestamo.monto_total.toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
                          {prestamo.cuotas_pagadas}/{prestamo.cantidad_cuotas}
                        </TableCell>
                        <TableCell>
                          <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${(prestamo.cuotas_pagadas / prestamo.cantidad_cuotas) * 100}%` }}
                            ></div>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedPrestamos.includes(prestamo.id) && prestamo.cuotas.map(cuota => (
                        <TableRow key={cuota.id} className="bg-slate-50">
                          <TableCell></TableCell>
                          <TableCell colSpan={2} className="text-sm">
                            Cuota {cuota.numero_cuota}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            ${cuota.monto.toLocaleString('es-AR')}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {cuota.fecha_pago ? 
                              new Date(cuota.fecha_pago).toLocaleDateString('es-AR') : 
                              '-'}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(cuota.estado)}`}>
                              {cuota.estado}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
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

export default LoanDetails;