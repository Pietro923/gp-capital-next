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
import { PagarDialog } from "@/components/PagarDialog";

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
  const [open, setOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
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

  useEffect(() => {
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
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
        <CardTitle>Detalle de Préstamos y Cuotas</CardTitle>
        <Button variant="outline" onClick={exportToExcel} className="w-full sm:w-auto">
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
          
          {/* Tabla para pantallas medianas y grandes */}
          <div className="hidden md:block rounded-md border">
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
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(cuota.estado)}`}>
                              {cuota.estado}
                            </span>
                            
                            {cuota.estado !== 'PAGADO' && (
                              <>
                                <Button 
                                  size="sm"
                                  onClick={() => setOpen(true)}
                                >
                                  Pagar
                                </Button>
                                <PagarDialog
                                  open={open}
                                  onOpenChange={setOpen}
                                  onConfirm={() => {
                                    // Recargar los datos después del pago
                                    fetchData();
                                    setOpen(false);
                                  }}
                                  numeroCuota={cuota.numero_cuota}
                                  cuotaId={cuota.id}
                                  prestamoId={prestamo.id}
                                  montoCuota={cuota.monto}
                                />
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Vista de tarjetas para móviles */}
          <div className="block md:hidden space-y-4">
            {filteredPrestamos.map(prestamo => (
              <div key={prestamo.id} className="border rounded-lg shadow-sm overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-slate-50"
                  onClick={() => toggleExpanded(prestamo.id)}
                >
                  <div className="flex items-center space-x-2">
                    {expandedPrestamos.includes(prestamo.id) ? 
                      <ChevronDown className="h-4 w-4 flex-shrink-0" /> : 
                      <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                    <div>
                      <div className="font-medium">{`${prestamo.cliente.nombre} ${prestamo.cliente.apellido}`}</div>
                      <div className="text-sm text-slate-500">DNI: {prestamo.cliente.dni}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${prestamo.monto_total.toLocaleString('es-AR')}</div>
                    <div className="text-sm text-slate-500">
                      {prestamo.cuotas_pagadas}/{prestamo.cantidad_cuotas} cuotas
                    </div>
                  </div>
                </div>
                
                <div className="px-4 pb-2">
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${(prestamo.cuotas_pagadas / prestamo.cantidad_cuotas) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                {expandedPrestamos.includes(prestamo.id) && (
                  <div className="bg-slate-50 divide-y divide-slate-200">
                    {prestamo.cuotas.map(cuota => (
                      <div key={cuota.id} className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-medium">Cuota {cuota.numero_cuota}</div>
                          <div className="font-medium">${cuota.monto.toLocaleString('es-AR')}</div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-slate-500">
                            {cuota.fecha_pago ? 
                              `Pagado: ${new Date(cuota.fecha_pago).toLocaleDateString('es-AR')}` : 
                              'No pagado'}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(cuota.estado)}`}>
                              {cuota.estado}
                            </span>
                            
                            {cuota.estado !== 'PAGADO' && (
                              <>
                                <Button 
                                  size="sm"
                                  onClick={() => setOpen(true)}
                                >
                                  Pagar
                                </Button>
                                <PagarDialog
                                  open={open}
                                  onOpenChange={setOpen}
                                  onConfirm={() => {
                                    fetchData();
                                    setOpen(false);
                                  }}
                                  numeroCuota={cuota.numero_cuota}
                                  cuotaId={cuota.id}
                                  prestamoId={prestamo.id}
                                  montoCuota={cuota.monto}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);
};

export default LoanDetails;