"use client"
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Download } from "lucide-react";
import { supabase } from '@/utils/supabase/client';
import * as XLSX from 'xlsx';

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

interface Purchase {
  id: string;
  date: string;
  provider: string;
  product: string;
  netoAmount: number;
  ivaAmount: number;
  otrosAmount: number;
  totalAmount: number;
  comentarios: string;
  status: string;
  comprobante: string;
  tipoComprobante: string;
  puntoVenta: string;
}

export default function Purchases() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formaPagoId, setFormaPagoId] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  // Estado para el formulario
  const [formData, setFormData] = useState({
    providerId: '',
    netoAmount: '',
    ivaPercentage: '21',
    otrosAmount: '0',
    date: '',
    product: '',
    quantity: '1',
    comentarios: '',
    comprobante: '',
    tipoComprobante: 'A',
    puntoVenta: ''
  });

  // Calcular montos
  const calcularIVA = () => {
    if (!formData.netoAmount) return 0;
    const neto = parseFloat(formData.netoAmount);
    const ivaPercentage = parseFloat(formData.ivaPercentage) / 100;
    return neto * ivaPercentage;
  };

  const calcularTotal = () => {
    if (!formData.netoAmount) return 0;
    const neto = parseFloat(formData.netoAmount);
    const iva = calcularIVA();
    const otros = parseFloat(formData.otrosAmount) || 0;
    return neto + iva + otros;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Cargar forma de pago por defecto
  useEffect(() => {
    const fetchFormaPago = async () => {
      try {
        const { data, error } = await supabase
          .from('formas_pago')
          .select('id')
          .limit(1);
        if (error) throw error;
        if (data && data.length > 0) {
          setFormaPagoId(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching forma_pago:', error);
      }
    };
    fetchFormaPago();
  }, []);

  // Cargar proveedores
  useEffect(() => {
    const fetchProveedores = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('proveedores')
          .select('*');
        if (error) throw error;
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

  // Cargar compras con sus detalles
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const { data, error } = await supabase
          .from('compras')
          .select(`
            *,
            proveedores (nombre),
            detalles_compra (
              descripcion,
              cantidad,
              precio_unitario
            )
          `)
          .order('fecha_compra', { ascending: false });
        if (error) throw error;
        
        const formattedPurchases = data.map(purchase => ({
          id: purchase.id,
          date: purchase.fecha_compra,
          provider: purchase.proveedores?.nombre || 'Desconocido',
          product: purchase.detalles_compra[0]?.descripcion || 'Sin detalle',
          netoAmount: purchase.total_neto || 0,
          ivaAmount: purchase.iva || 0,
          otrosAmount: purchase.otros_gastos || 0,
          totalAmount: purchase.total_factura || 0,
          comentarios: purchase.comentarios || '',
          status: purchase.estado || 'Completado',
          comprobante: purchase.numero_factura || '',
          tipoComprobante: purchase.tipo_factura || 'A',
          puntoVenta: purchase.punto_venta || ''
        }));
        
        setPurchases(formattedPurchases);
      } catch (error) {
        console.error('Error fetching purchases:', error);
        setError('Error al cargar las compras');
      }
    };
    fetchPurchases();
  }, []);

  // Manejar cambios en el formulario
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Registrar nueva compra y editar
  const handleSubmit = async () => {
  if (!formData.providerId || !formData.netoAmount || !formData.date || !formData.product) {
    setError('Por favor complete todos los campos obligatorios');
    return;
  }
  
  setIsSubmitting(true);
  setError(null);
  
  try {
    const provider = providers.find(p => p.id.toString() === formData.providerId);
    const netoAmount = parseFloat(formData.netoAmount);
    const ivaAmount = calcularIVA();
    const otrosAmount = parseFloat(formData.otrosAmount) || 0;
    const totalAmount = calcularTotal();
    
    // Crear número de factura compuesto
    const numeroFactura = formData.comprobante ? 
      `${formData.puntoVenta}-${formData.comprobante}` : 
      `F-${Date.now()}`;
    
    // Si está en modo edición, actualizar la compra existente
    if (isEditMode && editingPurchase) {
      // Actualizar la compra principal
      const { error: compraError } = await supabase
        .from('compras')
        .update({
          proveedor_id: formData.providerId,
          total_factura: totalAmount,
          fecha_compra: formData.date,
          tipo_factura: formData.tipoComprobante,
          total_neto: netoAmount,
          iva: ivaAmount,
          otros_gastos: otrosAmount,
          numero_factura: numeroFactura,
          punto_venta: formData.puntoVenta,
          comentarios: formData.comentarios
        })
        .eq('id', editingPurchase.id);
        
      if (compraError) throw compraError;
      
      // Actualizar detalles_compra
      const { error: detalleError } = await supabase
        .from('detalles_compra')
        .update({
          descripcion: formData.product,
          cantidad: parseInt(formData.quantity),
          precio_unitario: netoAmount / parseInt(formData.quantity),
          subtotal: netoAmount
        })
        .eq('compra_id', editingPurchase.id);
        
      if (detalleError) throw detalleError;
      
      // Actualizar la lista local
      setPurchases(prev => prev.map(p => 
        p.id === editingPurchase.id 
          ? {
              ...p,
              date: formData.date,
              provider: provider?.nombre || 'Desconocido',
              product: formData.product,
              netoAmount: netoAmount,
              ivaAmount: ivaAmount,
              otrosAmount: otrosAmount,
              totalAmount: totalAmount,
              comentarios: formData.comentarios,
              comprobante: formData.comprobante,
              tipoComprobante: formData.tipoComprobante,
              puntoVenta: formData.puntoVenta
            }
          : p
      ));
      
      // Salir del modo edición
      setIsEditMode(false);
      setEditingPurchase(null);
      
    } else {
      // Crear nueva compra (código original)
      const { data: compraData, error: compraError } = await supabase
        .from('compras')
        .insert([
          {
            proveedor_id: formData.providerId,
            total_factura: totalAmount,
            fecha_compra: formData.date,
            tipo_factura: formData.tipoComprobante,
            total_neto: netoAmount,
            iva: ivaAmount,
            otros_gastos: otrosAmount,
            forma_pago_id: formaPagoId,
            numero_factura: numeroFactura,
            punto_venta: formData.puntoVenta,
            comentarios: formData.comentarios
          }
        ])
        .select();
        
      if (compraError) throw compraError;
      
      // Insertar en detalles_compra
      const { error: detalleError } = await supabase
        .from('detalles_compra')
        .insert([
          {
            compra_id: compraData[0].id,
            descripcion: formData.product,
            cantidad: parseInt(formData.quantity),
            precio_unitario: netoAmount / parseInt(formData.quantity),
            subtotal: netoAmount
          }
        ]);
        
      if (detalleError) throw detalleError;
      
      // Actualizar la lista de compras
      setPurchases(prev => [{
        id: compraData[0].id,
        date: compraData[0].fecha_compra,
        provider: provider?.nombre || 'Desconocido',
        product: formData.product,
        netoAmount: netoAmount,
        ivaAmount: ivaAmount,
        otrosAmount: otrosAmount,
        totalAmount: totalAmount,
        comentarios: formData.comentarios,
        status: 'Completado',
        comprobante: formData.comprobante,
        tipoComprobante: formData.tipoComprobante,
        puntoVenta: formData.puntoVenta
      }, ...prev]);
    }
    
    // Limpiar el formulario
    setFormData({
      providerId: '',
      netoAmount: '',
      ivaPercentage: '21',
      otrosAmount: '0',
      date: '',
      product: '',
      quantity: '1',
      comentarios: '',
      comprobante: '',
      tipoComprobante: 'A',
      puntoVenta: ''
    });
    
  } catch (error) {
    console.error('Error processing purchase:', error);
    setError(isEditMode ? 'Error al actualizar la compra' : 'Error al registrar la compra');
  } finally {
    setIsSubmitting(false);
  }
};

  // Función para exportar a Excel
  const exportToExcel = () => {
    try {
      // Preparar los datos para el Excel
      const dataToExport = purchases.map(item => ({
        'Fecha': item.date,
        'Proveedor': item.provider,
        'Producto': item.product,
        'Tipo Comp.': item.tipoComprobante,
        'N° Comp.': item.comprobante,
        'Punto Venta': item.puntoVenta,
        'Neto': item.netoAmount,
        'IVA': item.ivaAmount,
        'Otros': item.otrosAmount,
        'Total': item.totalAmount,
        'Comentarios': item.comentarios,
        'Estado': item.status
      }));
      
      // Crear una nueva hoja de trabajo
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      
      // Ajustar el ancho de las columnas
      const wscols = [
        { wch: 15 }, // Fecha
        { wch: 20 }, // Proveedor
        { wch: 30 }, // Producto
        { wch: 10 }, // Tipo Comprobante
        { wch: 15 }, // N° Comprobante
        { wch: 12 }, // Punto Venta
        { wch: 12 }, // Neto
        { wch: 12 }, // IVA
        { wch: 12 }, // Otros
        { wch: 12 }, // Total
        { wch: 30 }, // Comentarios
        { wch: 15 }, // Estado
      ];
      worksheet['!cols'] = wscols;
      
      // Crear un libro de trabajo
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Compras');
      
      // Generar el archivo Excel y descargarlo
      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Reporte_Compras_${date}.xlsx`);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      setError('Error al exportar a Excel');
    }
  };

  const handleEdit = (purchase: Purchase) => {
  setEditingPurchase(purchase);
  setIsEditMode(true);
  setFormData({
    providerId: '', // Necesitarías obtener el ID del proveedor
    netoAmount: purchase.netoAmount.toString(),
    ivaPercentage: ((purchase.ivaAmount / purchase.netoAmount) * 100).toString(),
    otrosAmount: purchase.otrosAmount.toString(),
    date: purchase.date,
    product: purchase.product,
    quantity: '1', // Podrías obtener esto de detalles_compra
    comentarios: purchase.comentarios,
    comprobante: purchase.comprobante,
    tipoComprobante: purchase.tipoComprobante,
    puntoVenta: purchase.puntoVenta
  });
};

const handleDelete = async (purchaseId: string) => {
  if (!confirm('¿Está seguro de eliminar esta compra?')) return;
  
  try {
    const { error } = await supabase
      .from('compras')
      .update({ eliminado: true, fecha_eliminacion: new Date().toISOString() })
      .eq('id', purchaseId);
      
    if (error) throw error;
    
    setPurchases(prev => prev.filter(p => p.id !== purchaseId));
  } catch (error) {
    console.error('Error deleting purchase:', error);
    setError('Error al eliminar la compra');
  }
};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nueva Compra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select 
                onValueChange={(value) => handleChange('providerId', value)}
                value={formData.providerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id.toString()}>
                      {provider.nombre} - {provider.marca}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Producto</Label>
              <Input 
                type="text" 
                placeholder="Descripción del producto"
                value={formData.product}
                onChange={(e) => handleChange('product', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input 
                type="number" 
                min="1"
                placeholder="1"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Comprobante</Label>
              <Select
                onValueChange={(value) => handleChange('tipoComprobante', value)}
                value={formData.tipoComprobante}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar Tipo de Comprobante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Punto de Venta</Label>
              <Input 
                type="text" 
                placeholder="0000"
                value={formData.puntoVenta}
                onChange={(e) => handleChange('puntoVenta', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Nº de comprobante</Label>
              <Input 
                type="text" 
                placeholder="Número de factura o comprobante"
                value={formData.comprobante}
                onChange={(e) => handleChange('comprobante', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Neto</Label>
              <Input 
                type="number" 
                placeholder="0.00"
                value={formData.netoAmount}
                onChange={(e) => handleChange('netoAmount', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
  <Label htmlFor="ivaPercentage">IVA (%)</Label>
  <Input
    id="ivaPercentage"
    type="number"
    step="0.01"
    min="0"
    placeholder="Ej: 21%"
    value={formData.ivaPercentage}
    onChange={(e) => handleChange('ivaPercentage', e.target.value)}
  />
  <div className="text-sm text-gray-500 mt-1">
    Valor: ${calcularIVA().toFixed(2)}
  </div>
</div>
            
            <div className="space-y-2">
              <Label>Otros</Label>
              <Input 
                type="number" 
                placeholder="0.00"
                value={formData.otrosAmount}
                onChange={(e) => handleChange('otrosAmount', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Fecha</Label>
              <div className="relative">
                <Input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-500" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Comentarios</Label>
              <Input 
                type="text" 
                placeholder="Detalles adicionales"
                value={formData.comentarios}
                onChange={(e) => handleChange('comentarios', e.target.value)}
              />
            </div>

            <div className="col-span-1 sm:col-span-3">
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between font-semibold mb-1">
                  <span>Total:</span>
                  <span>${calcularTotal().toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-500">
                  Neto: ${parseFloat(formData.netoAmount || '0').toFixed(2)} + 
                  IVA: ${calcularIVA().toFixed(2)} + 
                  Otros: ${parseFloat(formData.otrosAmount || '0').toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="col-span-1 sm:col-span-3">
              {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            </div>
            
            <div className="col-span-1 sm:col-span-3">
              <Button 
  className="w-full" 
  onClick={handleSubmit}
  disabled={isSubmitting}
>
  {isSubmitting 
    ? (isEditMode ? 'Actualizando...' : 'Registrando...') 
    : (isEditMode ? 'Actualizar Compra' : 'Registrar Compra')
  }
</Button>
{isEditMode && (
  <Button 
    variant="outline" 
    className="w-full mt-2" 
    onClick={() => {
      setIsEditMode(false);
      setEditingPurchase(null);
      setFormData({
        providerId: '', netoAmount: '', ivaPercentage: '21', otrosAmount: '0',
        date: '', product: '', quantity: '1', comentarios: '',
        comprobante: '', tipoComprobante: 'A', puntoVenta: ''
      });
    }}
  >
    Cancelar Edición
  </Button>
)}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Historial de Compras</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToExcel} 
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            Exportar a Excel
          </Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="hidden md:table-cell">Producto</TableHead>
                  <TableHead className="hidden md:table-cell">Tipo</TableHead>
                  <TableHead className="hidden lg:table-cell">Punto de Venta</TableHead>
                  <TableHead className="hidden lg:table-cell">Nº Comprobante</TableHead>
                  <TableHead>Neto</TableHead>
                  <TableHead>IVA</TableHead>
                  <TableHead>Otros</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="hidden lg:table-cell">Comentarios</TableHead>
                  <TableHead className="hidden sm:table-cell">Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="hidden sm:table-cell">{purchase.date}</TableCell>
                    <TableCell className="font-medium">{purchase.provider}</TableCell>
                    <TableCell className="hidden md:table-cell">{purchase.product}</TableCell>
                    <TableCell className="hidden md:table-cell">{purchase.tipoComprobante}</TableCell>
                    <TableCell className="hidden lg:table-cell">{purchase.puntoVenta}</TableCell>
                    <TableCell className="hidden lg:table-cell">{purchase.comprobante}</TableCell>
                    <TableCell>${purchase.netoAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    <TableCell>${purchase.ivaAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    <TableCell>${purchase.otrosAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    <TableCell>${purchase.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    <TableCell className="hidden lg:table-cell">{purchase.comentarios}</TableCell>
                    <TableCell className="hidden sm:table-cell">{purchase.status}</TableCell>
                    <TableCell>
  <div className="flex gap-2">
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => handleEdit(purchase)}
    >
      ✏️
    </Button>
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => handleDelete(purchase.id)}
      className="text-red-600"
    >
      🗑️
    </Button>
  </div>
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
}