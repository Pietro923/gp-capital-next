"use client";
import React, { useState } from 'react';
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
import { Calculator, Download } from "lucide-react";
import { GenerarPrestamo } from "@/components/GenerarPrestamo";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CuotaSimulada {
  numero: number;
  fechaVencimiento: string;
  capitalInicial: number;
  interes: number;
  iva: number;
  cuota: number;
  capitalRestante: number;
}

interface ExcelRow {
  [key: string]: string | number;
}

const LoanSimulator: React.FC = () => {
  const [monto, setMonto] = useState<number>(0);
  const [plazo, setPlazo] = useState<number>(12);
  const [tasaInteres, setTasaInteres] = useState<number>(65);
  const [empresa, setEmpresa] = useState<string>('Pueble');
  const [frecuencia, setFrecuencia] = useState<string>('mensual');
  const [porcentajeIVA, setPorcentajeIVA] = useState<number>(21);
  const [aplicarIVA, setAplicarIVA] = useState<boolean>(true);
  const [cuotas, setCuotas] = useState<CuotaSimulada[]>([]);
  const [cuotaPeriodica, setCuotaPeriodica] = useState<number>(0);
  const [montoTotal, setMontoTotal] = useState<number>(0);
  const [open, setOpen] = useState(false);

  // Función para obtener los plazos basados en la frecuencia
  const getPlazosDisponibles = () => {
    if (frecuencia === 'semestral') {
      return [2, 4, 6, 8, 10];  // 1, 2, 3, 4, 5 años en cuotas semestrales
    } else {
      return [12, 24, 36, 48, 60];  // 1, 2, 3, 4, 5 años en cuotas mensuales
    }
  };

  // Función para ajustar el plazo al cambiar de frecuencia
  const ajustarPlazo = (nuevaFrecuencia: string) => {
    if (nuevaFrecuencia === 'semestral') {
      // Si cambia a semestral, ajustar al número más cercano de semestres
      const semestresCercanos = Math.round(plazo / 6);
      setPlazo(Math.max(2, Math.min(10, semestresCercanos * 2)));
    } else {
      // Si cambia a mensual, ajustar al número más cercano de meses
      const mesesCercanos = Math.round(plazo * 6);
      setPlazo(Math.max(12, Math.min(60, mesesCercanos)));
    }
  };

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
    let fecha = new Date();
    let montoTotalCalculado = 0;
    
    for (let i = 1; i <= plazo; i++) {
      // Ajustar fecha según frecuencia
      if (frecuencia === 'semestral') {
        fecha = new Date(fecha.setMonth(fecha.getMonth() + 6));
      } else {
        fecha = new Date(fecha.setMonth(fecha.getMonth() + 1));
      }
      
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simulador de Préstamos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Empresa</label>
              <Select value={empresa} onValueChange={setEmpresa}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pueble">Pueble (Case)</SelectItem>
                  <SelectItem value="Semage">Semage (Repuestos)</SelectItem>
                  <SelectItem value="Magi">Magi (Ducati)</SelectItem>
                  <SelectItem value="ub.ti">ub.ti (Audi)</SelectItem>
                  <SelectItem value="Cpm">Cpm (Kia)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
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
                  ajustarPlazo(v);
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
              <label className="text-sm font-medium">Plazo</label>
              <Select 
                value={plazo.toString()} 
                onValueChange={(v) => setPlazo(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plazo" />
                </SelectTrigger>
                <SelectContent>
                  {getPlazosDisponibles().map((p) => (
                    <SelectItem key={p} value={p.toString()}>
                      {p} {frecuencia === 'semestral' ? 'semestres' : 'meses'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="flex justify-between items-center mb-6">
            <Button onClick={calcularCuotas}>
              <Calculator className="mr-2 h-4 w-4" />
              Calcular
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Calculator className="mr-2 h-4 w-4" />
              Generar Préstamo
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
                Exportar
              </Button>
            )}
          </div>

          {cuotas.length > 0 && (
            <div className="space-y-4">
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

              <div className="rounded-md border">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanSimulator;