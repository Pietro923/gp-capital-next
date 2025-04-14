"use client";
import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calculator, Download, ChevronRight, ChevronDown } from "lucide-react";
import { GenerarPrestamo } from "@/components/GenerarPrestamo";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from '@/utils/supabase/client';

interface CuotaSimulada {
  numero: number;
  fechaVencimiento: string;
  capitalInicial: number;
  interes: number;
  iva: number;
  cuota: number;
  capitalRestante: number;
}

interface Proveedor {
  id: string;
  nombre: string;
  cuit: string;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  contacto: string | null;
  observaciones: string | null;
  created_at: string;
}

interface ExcelRow {
  [key: string]: string | number;
}

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  direccion: string;
  dni: string;
}

const LoanSimulator: React.FC = () => {
  const [monto, setMonto] = useState<number>(0);
  const [plazo, setPlazo] = useState<number>(12);
  const [tasaInteres, setTasaInteres] = useState<number>(65);
  const [empresa] = useState<string>('Proveedor');
  const [frecuencia, setFrecuencia] = useState<string>('mensual');
  const [moneda, setMoneda] = useState<string>('Pesos');
  const [porcentajeIVA, setPorcentajeIVA] = useState<number>(21);
  const [aplicarIVA, setAplicarIVA] = useState<boolean>(true);
  const [cuotas, setCuotas] = useState<CuotaSimulada[]>([]);
  const [cuotaPeriodica, setCuotaPeriodica] = useState<number>(0);
  const [montoTotal, setMontoTotal] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [expandedCuota, setExpandedCuota] = useState<number | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
    const [clienteId, setClienteId] = useState<string>("");

  const [, setProveedores] = useState<Proveedor[]>([]);
  const [, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  
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
      } catch (error) {
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProveedores();
  }, []);
  
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const { data: clientesData, error: clientesError } = await supabase
          .from('clientes')
          .select('*')
          .order('apellido');
  
        if (clientesError) throw clientesError;
        if (clientesData) setClientes(clientesData);
      } catch (error) {
        console.error('Error cargando clientes:', error);
        setError('Error al cargar los clientes');
      }
    };
  
    fetchClientes();
  }, []);
  


  const calcularCuotas = () => {
    // Determinar periodos por año según la frecuencia
    const periodosPorAnio = frecuencia === 'semestral' ? 2 : 12;
    
    // Calcular tasa por periodo
    const tasaPorPeriodo = tasaInteres / periodosPorAnio / 100;
    
    // Calcular cuota base sin IVA
    const cuotaBase = 
      (monto * tasaPorPeriodo * Math.pow(1 + tasaPorPeriodo, plazo)) / 
      (Math.pow(1 + tasaPorPeriodo, plazo) - 1);
    
    const nuevasCuotas: CuotaSimulada[] = [];
    let capitalPendiente = monto;
    
    const fecha = new Date();
// Establecer el primer día del mes actual para evitar problemas con meses de diferente longitud
fecha.setDate(1);
// Establecer el día 10 del mes actual como primera fecha de vencimiento
fecha.setDate(10);
    
    let montoTotalCalculado = 0;
    
    for (let i = 1; i <= plazo; i++) {
      // Primero avanzar el mes
      if (frecuencia === 'semestral') {
        fecha.setMonth(fecha.getMonth() + 6);
      } else {
        fecha.setMonth(fecha.getMonth() + 1);
      }
      // Luego establecer el día 10
      fecha.setDate(11);
      // ...

      
      const interesCuota = capitalPendiente * tasaPorPeriodo;
      
      // Calcular IVA sobre el interés si corresponde
      const ivaCuota = aplicarIVA ? interesCuota * (porcentajeIVA / 100) : 0;
      
      // Calcular cuota final (capital + interés + IVA)
      const cuotaFinal = aplicarIVA ? 
        (monto * tasaPorPeriodo * Math.pow(1 + tasaPorPeriodo, plazo) * (1 + porcentajeIVA/100)) / 
        (Math.pow(1 + tasaPorPeriodo, plazo) - 1) :
        cuotaBase;
      
      const capitalCuota = cuotaBase - interesCuota;
      capitalPendiente -= capitalCuota;
      
      montoTotalCalculado += cuotaFinal;
      nuevasCuotas.push({
        numero: i,
        fechaVencimiento: fecha.toISOString().split('T')[0],
        capitalInicial: capitalPendiente + capitalCuota,
        interes: interesCuota,
        iva: ivaCuota,
        cuota: cuotaFinal,
        capitalRestante: capitalPendiente
      });
    }
    setCuotas(nuevasCuotas);
    setCuotaPeriodica(nuevasCuotas[0].cuota);
    setMontoTotal(montoTotalCalculado);
  };

  const exportToExcel = () => {
    const excelData: ExcelRow[] = cuotas.map(cuota => ({
      'Número de Cuota': cuota.numero,
      'Fecha Vencimiento': new Date(cuota.fechaVencimiento).toLocaleDateString('es-AR'),
      'Capital Inicial': Math.round(cuota.capitalInicial),
      'Interés': Math.round(cuota.interes),
      'IVA': Math.round(cuota.iva),
      'Cuota Total': Math.round(cuota.cuota),
      'Capital Restante': Math.round(cuota.capitalRestante)
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
    link.setAttribute('download', `simulacion_prestamo_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleCuotaDetails = (numero: number) => {
    if (expandedCuota === numero) {
      setExpandedCuota(null);
    } else {
      setExpandedCuota(numero);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simulador de Préstamos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Moneda</label>
              <Select value={moneda} onValueChange={setMoneda}>
                <SelectTrigger>
                  <SelectValue>{moneda}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dolar">Dólar</SelectItem>
                  <SelectItem value="Pesos">Pesos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.apellido}, {cliente.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            {/* <div className="space-y-2">
              <label className="text-sm font-medium">Empresa</label>
              <Select value={empresa} onValueChange={setEmpresa}>
                <SelectTrigger>
                  <SelectValue>{empresa}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>
                    Seleccionar empresa
                  </SelectItem>
                  {proveedores.map((proveedor) => (
                    <SelectItem key={proveedor.id} value={proveedor.nombre}>
                      {proveedor.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            */}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto del Préstamo</label>
              <Input
                type="number"
                min="0"
                value={monto}
                onChange={(e) => setMonto(Number(e.target.value))}
                placeholder="Ingrese el monto"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Frecuencia de Pago</label>
              <Select 
                value={frecuencia} 
                onValueChange={(v) => {
                  setFrecuencia(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar frecuencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Plazo ({frecuencia === 'semestral' ? 'Semestres' : 'Meses'})</label>
              <Input
                type="number"
                min="1"
                value={plazo}
                onChange={(e) => setPlazo(Number(e.target.value))}
                placeholder="Ingrese el plazo"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tasa de Interés Anual (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={tasaInteres}
                onChange={(e) => setTasaInteres(Number(e.target.value))}
                placeholder="Ingrese la tasa"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="aplicarIVA" 
                  checked={aplicarIVA} 
                  onCheckedChange={(checked: boolean) => setAplicarIVA(checked as boolean)}
                />
                <Label htmlFor="aplicarIVA">Aplicar IVA sobre el interés</Label>
              </div>
            </div>
            {aplicarIVA && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Porcentaje de IVA (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={porcentajeIVA}
                  onChange={(e) => setPorcentajeIVA(Number(e.target.value))}
                  placeholder="Ingrese el porcentaje de IVA"
                />
              </div>
            )}
          </div>
          
          {/* Botones responsivos */}
          <div className="flex flex-wrap gap-2 justify-between items-center mb-6">
            <Button onClick={calcularCuotas}>
              <Calculator className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Calcular</span>
              <span className="sm:hidden">Calc</span>
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Calculator className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Generar Préstamo</span>
              <span className="sm:hidden">Generar</span>
            </Button>
            <GenerarPrestamo
              open={open}
              onOpenChange={setOpen}
              onConfirm={() => {
                setOpen(false);
                // Opcional: limpiar el formulario después de generar el préstamo
                setMonto(0);
                setPlazo(frecuencia === 'semestral' ? 2 : 12);
                setTasaInteres(65);
                setCuotas([]);
              }}
              prestamoData={{
                monto,
                plazo,
                tasaInteres,
                empresa,
                frecuencia,
                iva: aplicarIVA ? porcentajeIVA : 0,
                cuotas: cuotas.map(c => ({
                  numero: c.numero,
                  fechaVencimiento: c.fechaVencimiento,
                  cuota: c.cuota
                }))
              }}
            />
            
            {cuotas.length > 0 && (
              <Button variant="outline" onClick={exportToExcel}>
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
                <span className="sm:hidden">Exp</span>
              </Button>
            )}
          </div>
          
          {cuotas.length > 0 && (
            <div className="space-y-4">
              {/* Cards responsivas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      ${Math.round(cuotaPeriodica).toLocaleString('es-AR')}
                    </div>
                    <div className="text-sm text-slate-500">
                      Cuota {frecuencia === 'semestral' ? 'Semestral' : 'Mensual'}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">
                      ${Math.round(montoTotal).toLocaleString('es-AR')}
                    </div>
                    <div className="text-sm text-slate-500">Monto Total a Pagar</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-purple-600">
                      ${Math.round(montoTotal - monto).toLocaleString('es-AR')}
                    </div>
                    <div className="text-sm text-slate-500">
                      Costo Financiero Total
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Vista de tabla para escritorio */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuota</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead className="text-right">Capital</TableHead>
                      <TableHead className="text-right">Interés</TableHead>
                      {aplicarIVA && (
                        <TableHead className="text-right">IVA</TableHead>
                      )}
                      <TableHead className="text-right">Cuota Total</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuotas.map((cuota) => (
                      <TableRow key={cuota.numero}>
                        <TableCell>
                          <Badge variant="outline">
                            {cuota.numero}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(cuota.fechaVencimiento).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Math.round(cuota.capitalInicial - cuota.capitalRestante).toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Math.round(cuota.interes).toLocaleString('es-AR')}
                        </TableCell>
                        {aplicarIVA && (
                          <TableCell className="text-right">
                            ${Math.round(cuota.iva).toLocaleString('es-AR')}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-medium">
                          ${Math.round(cuota.cuota).toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Math.round(cuota.capitalRestante).toLocaleString('es-AR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Vista acordeón para móviles */}
              <div className="md:hidden space-y-2">
                {cuotas.map((cuota) => (
                  <Card key={cuota.numero} className="overflow-hidden">
                    <div 
                      className="flex justify-between items-center p-4 cursor-pointer"
                      onClick={() => toggleCuotaDetails(cuota.numero)}
                    >
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2">
                          {cuota.numero}
                        </Badge>
                        <span>{new Date(cuota.fechaVencimiento).toLocaleDateString('es-AR')}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium mr-2">
                          ${Math.round(cuota.cuota).toLocaleString('es-AR')}
                        </span>
                        {expandedCuota === cuota.numero ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </div>
                    
                    {expandedCuota === cuota.numero && (
                      <div className="px-4 pb-4 pt-0 border-t">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-500">Capital:</div>
                          <div className="text-right">
                            ${Math.round(cuota.capitalInicial - cuota.capitalRestante).toLocaleString('es-AR')}
                          </div>
                          
                          <div className="text-slate-500">Interés:</div>
                          <div className="text-right">
                            ${Math.round(cuota.interes).toLocaleString('es-AR')}
                          </div>
                          
                          {aplicarIVA && (
                            <>
                              <div className="text-slate-500">IVA:</div>
                              <div className="text-right">
                                ${Math.round(cuota.iva).toLocaleString('es-AR')}
                              </div>
                            </>
                          )}
                          
                          <div className="text-slate-500">Saldo:</div>
                          <div className="text-right">
                            ${Math.round(cuota.capitalRestante).toLocaleString('es-AR')}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanSimulator;