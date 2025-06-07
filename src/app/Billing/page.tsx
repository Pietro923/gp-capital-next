"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Receipt, Trash2, Download, CheckCircle, FileText, Calendar } from "lucide-react";
import { supabase } from '@/utils/supabase/client';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Improved type definition for jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => void;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  netoAmount: number;
  ivaPercentage: number;
  ivaAmount: number;
  total: number;
}
type TipoCliente = "PERSONA_FISICA" | "EMPRESA";

interface Cliente {
  id: string;
  tipo_cliente: TipoCliente; // 👈 nuevo campo
  nombre: string;
  apellido?: string; // opcional si es empresa
  empresa?: string;  // opcional si es persona
  direccion: string;
  dni?: string;
  eliminado?: boolean; // 👈 Añade esta línea
  cuit: string;
  tipo_iva_id: string;
  tipo_iva?: { nombre: string };
}



interface TipoIva {
  porcentaje_iva: number;
  id: string;
  nombre: string;
}

interface FormaPago {
  id: string;
  nombre: string;
}

interface FacturaFormData {
  tipoFactura: string;
  clienteId: string;
  tipoIvaId: string;
  formaPagoId: string;
  puntoVenta: string;
  numeroFactura: string;
  fecha: string; // Nueva propiedad para la fecha
}

// Add interface for factura data
interface FacturaData {
  id: string;
  tipo_factura: string;
  cliente_id: string;
  tipo_iva_id: string;
  forma_pago_id: string;
  total_neto: number;
  iva: number;
  total_factura: number;
  created_at: string;
  numero_factura: number;
  cae?: string;
  cae_vencimiento?: string;
  afip_cargada: boolean;
  punto_venta: string;
  fecha_factura: string; // Nueva propiedad
  cliente: { 
    nombre: string; 
    apellido: string; 
    direccion: string; 
    dni: string;
    cuit: string;
    tipo_iva: { nombre: string };
  };
  tipo_iva: { nombre: string };
  forma_pago: { nombre: string };
}

const Billing: React.FC = () => {
  // Estados para los items de la factura
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [newItem, setNewItem] = useState<InvoiceItem>({
    description: '',
    quantity: 0,
    unitPrice: 0,
    netoAmount: 0,
    ivaPercentage: 21, // Por defecto 21%
    ivaAmount: 0,
    total: 0
  });

  // Estados para los datos de la factura
  const [formData, setFormData] = useState<FacturaFormData>({
    tipoFactura: '',
    clienteId: '',
    tipoIvaId: '',
    formaPagoId: '',
    puntoVenta: '0001',
    numeroFactura: '',
    fecha: new Date().toISOString().split('T')[0], // Fecha actual por defecto
  });

  // Estados para los datos externos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [, setTiposIva] = useState<TipoIva[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setFacturaActual] = useState<FacturaData | null>(null);
  
  // Estados para el historial de facturas
  const [facturas, setFacturas] = useState<FacturaData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Estados para el diálogo de AFIP
  const [showAfipDialog, setShowAfipDialog] = useState(false);
  const [afipData, setAfipData] = useState({
    numeroFactura: '',
    cae: '',
    caeVencimiento: '',
  });
  //const [facturaIdToUpdate, setFacturaIdToUpdate] = useState<string | null>(null);

  // Cargar datos necesarios
  useEffect(() => {
  const fetchData = async () => {
    try {
      // Cargar clientes con información de condición IVA
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('*, tipo_iva:tipo_iva_id(nombre)')
        .eq('eliminado', false); // 👈 Filtra solo clientes no eliminados
      
      if (clientesData) setClientes(clientesData);
      
      // El resto de tus llamadas permanecen igual...
      const { data: tiposIvaData } = await supabase
        .from('tipos_iva')
        .select('*');
      if (tiposIvaData) setTiposIva(tiposIvaData);
      
      const { data: formasPagoData } = await supabase
        .from('formas_pago')
        .select('*');
      if (formasPagoData) setFormasPago(formasPagoData);
      
      loadFacturasHistory();
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error al cargar los datos necesarios');
    }
  };
  fetchData();
}, []);

  // Cargar historial de facturas
  const loadFacturasHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error: historyError } = await supabase
        .from('facturacion')
        .select(`
          *,
          cliente:cliente_id(nombre, apellido, direccion, dni, cuit, tipo_iva:tipo_iva_id(nombre)),
          tipo_iva:tipo_iva_id(nombre),
          forma_pago:forma_pago_id(nombre)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (historyError) throw historyError;
      if (data) setFacturas(data as FacturaData[]);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Manejar selección de cliente
  const handleClienteChange = (clienteId: string) => {
    const clienteSeleccionado = clientes.find(c => c.id === clienteId);
    if (clienteSeleccionado) {
      setFormData(prev => ({
        ...prev,
        clienteId,
        tipoIvaId: clienteSeleccionado.tipo_iva_id || prev.tipoIvaId
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        clienteId
      }));
    }
  };

  // Calcular IVA para un item
  const calcularIVAItem = (netoAmount: number, ivaPercentage: number) => {
    const iva = (netoAmount * ivaPercentage) / 100;
    return iva;
  };

  // Manejar cambios en el nuevo item
  const handleNewItemChange = (field: keyof InvoiceItem, value: string | number) => {
    setNewItem(prev => {
      const updated = { ...prev, [field]: value };
      
      // Recalcular automáticamente cuando cambian valores relevantes
      if (field === 'netoAmount' || field === 'ivaPercentage') {
        updated.ivaAmount = calcularIVAItem(updated.netoAmount, updated.ivaPercentage);
        updated.total = updated.netoAmount + updated.ivaAmount;
      }
      
      // Si cambia la cantidad o precio unitario, recalcular neto
      if (field === 'quantity' || field === 'unitPrice') {
        updated.netoAmount = updated.quantity * updated.unitPrice;
        updated.ivaAmount = calcularIVAItem(updated.netoAmount, updated.ivaPercentage);
        updated.total = updated.netoAmount + updated.ivaAmount;
      }
      
      return updated;
    });
  };

  // Manejar items de la factura
  const handleAddItem = () => {
    if (newItem.description && newItem.quantity && (newItem.unitPrice || newItem.netoAmount)) {
      setItems([...items, { ...newItem }]);
      setNewItem({
        description: '',
        quantity: 0,
        unitPrice: 0,
        netoAmount: 0,
        ivaPercentage: 21,
        ivaAmount: 0,
        total: 0
      });
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calcular totales
  const totalNeto = items.reduce((sum, item) => sum + item.netoAmount, 0);
  const totalIVA = items.reduce((sum, item) => sum + item.ivaAmount, 0);
  const total = items.reduce((sum, item) => sum + item.total, 0);

  // Manejar cambios en los datos de la factura
  const handleFacturaDataChange = (field: keyof FacturaFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Generar PDF a partir de los datos de la factura
  const generatePDF = async (facturaId: string) => {
    try {
      // Obtener los datos completos de la factura
      const { data: facturaData, error: facturaError } = await supabase
        .from('facturacion')
        .select(`
          *,
          cliente:cliente_id(nombre, apellido, direccion, dni, cuit, tipo_iva:tipo_iva_id(nombre)),
          tipo_iva:tipo_iva_id(nombre),
          forma_pago:forma_pago_id(nombre)
        `)
        .eq('id', facturaId)
        .single();
      
      if (facturaError) throw facturaError;
      if (!facturaData) throw new Error('No se encontraron datos de la factura');
      
      // Obtener los detalles de la factura
      const { data: detallesData, error: detallesError } = await supabase
        .from('detalles_factura')
        .select('*')
        .eq('factura_id', facturaId);
      
      if (detallesError) throw detallesError;
      if (!detallesData) throw new Error('No se encontraron detalles de la factura');
      
      // Crear el documento PDF
      const doc = new jsPDF();
      const fechaFactura = facturaData.fecha_factura ? 
      new Date(facturaData.fecha_factura + 'T12:00:00') : 
      new Date(facturaData.created_at);
      const fecha = fechaFactura.toLocaleDateString('es-AR');
      
      // Encabezado
      doc.setFontSize(18);
      doc.text(`FACTURA ${facturaData.tipo_factura}`, 105, 20, { align: 'center' });
      doc.setFontSize(12);
      
      // Número de factura formateado con punto de venta
      const numeroFormatted = facturaData.punto_venta 
        ? `${facturaData.punto_venta}-${String(facturaData.numero_factura).padStart(8, '0')}` 
        : String(facturaData.numero_factura).padStart(8, '0');
      
      doc.text(`Nº: ${numeroFormatted}`, 105, 30, { align: 'center' });
      doc.text(`Fecha: ${fecha}`, 105, 40, { align: 'center' });
      
      // Datos de CAE si existen
      if (facturaData.cae) {
        doc.setFontSize(10);
        doc.text(`CAE: ${facturaData.cae}`, 105, 50, { align: 'center' });
        if (facturaData.cae_vencimiento) {
  const fechaVencimiento = new Date(facturaData.cae_vencimiento + 'T12:00:00').toLocaleDateString('es-AR');
  doc.text(`Vencimiento CAE: ${fechaVencimiento}`, 105, 55, { align: 'center' });
}
      }
      
      // Datos del emisor
      doc.setFontSize(10);
      doc.text('GP CAPITAL S.A.', 14, 60);

      
      // Datos del cliente
      doc.text(`Cliente: ${facturaData.cliente.nombre} ${facturaData.cliente.apellido}`, 14, 85);
      doc.text(`DNI/CUIT: ${facturaData.cliente.cuit || facturaData.cliente.dni}`, 14, 90);
      doc.text(`Dirección: ${facturaData.cliente.direccion}`, 14, 95);
      doc.text(`Condición IVA: ${facturaData.cliente.tipo_iva?.nombre || facturaData.tipo_iva.nombre}`, 14, 100);
      doc.text(`Forma de Pago: ${facturaData.forma_pago.nombre}`, 14, 105);
      
      // Tabla de items
      const tableColumn = ["Descripción", "Cantidad", "Precio Unit.", "Neto", "IVA", "Total"];
      const tableRows = detallesData.map(detalle => [
        detalle.descripcion,
        detalle.cantidad,
        `$${detalle.precio_unitario.toFixed(2)}`,
        `$${(detalle.cantidad * detalle.precio_unitario).toFixed(2)}`,
        `$${(detalle.subtotal - (detalle.cantidad * detalle.precio_unitario)).toFixed(2)}`,
        `$${detalle.subtotal.toFixed(2)}`
      ]);
      
      doc.autoTable({
        startY: 115,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [66, 66, 66] }
      });
      
      // Totales
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.text(`Subtotal: $${facturaData.total_neto.toFixed(2)}`, 140, finalY);
      doc.text(`IVA: $${facturaData.iva.toFixed(2)}`, 140, finalY + 7);
      doc.text(`TOTAL: $${facturaData.total_factura.toFixed(2)}`, 140, finalY + 14);
      
      // Leyenda según si está cargada en AFIP o no
      doc.setFontSize(8);
      if (facturaData.afip_cargada && facturaData.cae) {
        doc.text('Documento válido como factura oficial - AFIP', 105, 280, { align: 'center' });
      } else {
        doc.text('Documento no válido como factura oficial - Copia para uso interno', 105, 280, { align: 'center' });
      }
      
      // Descargar el PDF
      doc.save(`Factura_${facturaData.tipo_factura}_${numeroFormatted}.pdf`);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF de la factura');
    }
  };

  {/*
  / Actualizar factura con datos de AFIP
  const handleUpdateAfipData = async () => {
    if (!facturaIdToUpdate || !afipData.numeroFactura || !afipData.cae) {
      alert('Debe completar al menos el número de factura y CAE');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('facturacion')
        .update({
          numero_factura: parseInt(afipData.numeroFactura),
          cae: afipData.cae,
          cae_vencimiento: afipData.caeVencimiento || null,
          afip_cargada: true
        })
        .eq('id', facturaIdToUpdate);
      
      if (error) throw error;
      
      // Refrescar datos
      loadFacturasHistory();
      setShowAfipDialog(false);
      setAfipData({
        numeroFactura: '',
        cae: '',
        caeVencimiento: '',
      });
      setFacturaIdToUpdate(null);
      
      alert('Factura actualizada correctamente con datos de AFIP');
    } catch (error) {
      console.error('Error actualizando datos AFIP:', error);
      alert('Error al actualizar los datos de AFIP');
    }
  };
  

  // Abrir diálogo para actualizar datos AFIP
  const openAfipDialog = (factura: FacturaData) => {
    setFacturaIdToUpdate(factura.id);
    setAfipData({
      numeroFactura: factura.numero_factura ? String(factura.numero_factura) : '',
      cae: factura.cae || '',
      caeVencimiento: factura.cae_vencimiento || '',
    });
    setShowAfipDialog(true);
  };
  */}

  // Generar factura
  const handleGenerarFactura = async () => {
    if (!formData.tipoFactura || !formData.clienteId || !formData.tipoIvaId || !formData.formaPagoId || items.length === 0 || !formData.fecha) {
      setError('Por favor complete todos los campos necesarios');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Insertar la factura principal
      const { data: nuevaFactura, error: facturaError } = await supabase
        .from('facturacion')
        .insert([
          {
            tipo_factura: formData.tipoFactura,
            cliente_id: formData.clienteId,
            tipo_iva_id: formData.tipoIvaId,
            forma_pago_id: formData.formaPagoId,
            total_neto: totalNeto,
            iva: totalIVA,
            total_factura: total,
            punto_venta: formData.puntoVenta,
            numero_factura: formData.numeroFactura ? parseInt(formData.numeroFactura) : null,
            fecha_factura: formData.fecha, // Agregar fecha de factura
            afip_cargada: false
          }
        ])
        .select()
        .single();
      
      if (facturaError) throw facturaError;
      if (!nuevaFactura) throw new Error('No se pudo crear la factura');
      
      // Insertar los detalles de la factura
      const detallesPromises = items.map(item => 
        supabase
          .from('detalles_factura')
          .insert([
            {
              factura_id: nuevaFactura.id,
              descripcion: item.description,
              cantidad: item.quantity,
              precio_unitario: item.unitPrice,
              subtotal: item.total // Usar el total que incluye IVA
            }
          ])
      );
      
      await Promise.all(detallesPromises);
      
      // Guardar la factura actual para generar el PDF
      setFacturaActual(nuevaFactura as FacturaData);
      
      // Generar y descargar el PDF
      await generatePDF(nuevaFactura.id);
      
      // Refrescar el historial de facturas
      loadFacturasHistory();
      
      // Limpiar el formulario
      setItems([]);
      setFormData({
        tipoFactura: '',
        clienteId: '',
        tipoIvaId: '',
        formaPagoId: '',
        puntoVenta: formData.puntoVenta,
        numeroFactura: '',
        fecha: new Date().toISOString().split('T')[0], // Reset a fecha actual
      });
      
      alert('Factura generada exitosamente');
      
    } catch (error) {
      console.error('Error generando factura:', error);
      setError('Error al generar la factura');
    } finally {
      setIsLoading(false);
    }
  };

  // Estado de factura formateado
  const getEstadoFactura = (factura: FacturaData) => {
    if (factura.afip_cargada && factura.cae) {
      return <span className="text-green-600 flex items-center"><CheckCircle className="h-4 w-4 mr-1" />Registrada en AFIP</span>;
    }
    return <span className="text-amber-600 flex items-center">Pendiente de registrar en AFIP</span>;
  };

  return (
    <div className="container mx-auto p-4">
      <Tabs defaultValue="nueva" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="nueva">Nueva Factura</TabsTrigger>
          <TabsTrigger value="historial">Historial de Facturas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="nueva">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Datos de Factura</CardTitle>
                <CardDescription>Ingrese los datos básicos de la factura</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipoFactura">Tipo de Factura</Label>
                    <Select 
                      value={formData.tipoFactura} 
                      onValueChange={(value) => handleFacturaDataChange('tipoFactura', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Factura A</SelectItem>
                        <SelectItem value="B">Factura B</SelectItem>
                        <SelectItem value="C">Factura C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fecha">Fecha</Label>
                    <div className="relative">
                      <Input
                        id="fecha"
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => handleFacturaDataChange('fecha', e.target.value)}
                      />
                      <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-500" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="puntoVenta">Punto de Venta</Label>
                    <Input
                      id="puntoVenta"
                      value={formData.puntoVenta}
                      onChange={(e) => handleFacturaDataChange('puntoVenta', e.target.value)}
                      placeholder="0001"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="numeroFactura">Número de Factura</Label>
                    <Input
                      id="numeroFactura"
                      value={formData.numeroFactura}
                      onChange={(e) => handleFacturaDataChange('numeroFactura', e.target.value)}
                      placeholder="00000001"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select 
                      value={formData.clienteId} 
                      onValueChange={(value) => handleClienteChange(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.tipo_cliente === "EMPRESA"
                              ? cliente.empresa
                              : `${cliente.apellido ? cliente.apellido + ', ' : ''}${cliente.nombre}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="formaPago">Forma de Pago</Label>
                    <Select 
                      value={formData.formaPagoId} 
                      onValueChange={(value) => handleFacturaDataChange('formaPagoId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione forma de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        {formasPago.map(forma => (
                          <SelectItem key={forma.id} value={forma.id}>
                            {forma.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Items de la Factura</CardTitle>
                <CardDescription>Agregue los productos o servicios con detalle de impuestos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-6 items-end mb-4">
                  <div>
                    <Label htmlFor="itemDescription">Descripción</Label>
                    <Input
                      id="itemDescription"
                      value={newItem.description}
                      onChange={(e) => handleNewItemChange('description', e.target.value)}
                      placeholder="Descripción del item"
                    />
                  </div>
                  <div>
                    <Label htmlFor="itemQuantity">Cantidad</Label>
                    <Input
                      id="itemQuantity"
                      type="number"
                      value={newItem.quantity || ''}
                      onChange={(e) => handleNewItemChange('quantity', Number(e.target.value))}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="itemPrice">Precio Unit.</Label>
                    <Input
                      id="itemPrice"
                      type="number"
                      step="0.01"
                      value={newItem.unitPrice || ''}
                      onChange={(e) => handleNewItemChange('unitPrice', Number(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="itemNeto">Neto</Label>
                    <Input
                      id="itemNeto"
                      type="number"
                      step="0.01"
                      value={newItem.netoAmount || ''}
                      onChange={(e) => handleNewItemChange('netoAmount', Number(e.target.value))}
                      placeholder="0.00"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Auto: ${(newItem.quantity * newItem.unitPrice).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="itemIva">IVA (%)</Label>
                    <Input
                      id="itemIva"
                      type="number"
                      step="0.01"
                      value={newItem.ivaPercentage || ''}
                      onChange={(e) => handleNewItemChange('ivaPercentage', Number(e.target.value))}
                      placeholder="21"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Valor: ${newItem.ivaAmount.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      Total: ${newItem.total.toFixed(2)}
                    </div>
                    <Button 
                      onClick={handleAddItem}
                      className="flex items-center gap-1 w-full"
                    >
                      <Plus className="h-4 w-4" /> Agregar
                    </Button>
                  </div>
                </div>
                
                {items.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="text-right">Cant.</TableHead>
                          <TableHead className="text-right">P. Unit.</TableHead>
                          <TableHead className="text-right">Neto</TableHead>
                          <TableHead className="text-right">IVA %</TableHead>
                          <TableHead className="text-right">IVA $</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${item.netoAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{item.ivaPercentage}%</TableCell>
                            <TableCell className="text-right">${item.ivaAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">${item.total.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(index)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 font-medium">
                          <TableCell colSpan={3} className="text-right">TOTALES:</TableCell>
                          <TableCell className="text-right">${totalNeto.toFixed(2)}</TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right">${totalIVA.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-lg font-bold">${total.toFixed(2)}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Receipt className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No hay items agregados</p>
                  </div>
                )}
                
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                    {error}
                  </div>
                )}
                
                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={handleGenerarFactura}
                    disabled={isLoading || items.length === 0}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? 'Generando...' : (
                      <>
                        <FileText className="h-4 w-4" />
                        Generar Factura
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Facturas</CardTitle>
              <CardDescription>Listado de todas las facturas generadas</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="text-center py-8">Cargando historial...</div>
              ) : facturas.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-[100px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturas.map((factura) => (
                        <TableRow key={factura.id}>
                          <TableCell>
                            {new Date(factura.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{factura.tipo_factura}</TableCell>
                          <TableCell>
                            {factura.punto_venta 
                              ? `${factura.punto_venta}-${String(factura.numero_factura).padStart(8, '0')}` 
                              : String(factura.numero_factura).padStart(8, '0')
                            }
                          </TableCell>
                          <TableCell>
                            {factura.cliente.apellido 
                              ? `${factura.cliente.apellido}, ${factura.cliente.nombre}`
                              : factura.cliente.nombre
                            }
                          </TableCell>
                          <TableCell className="text-right">${factura.total_factura.toFixed(2)}</TableCell>
                          <TableCell>{getEstadoFactura(factura)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => generatePDF(factura.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No hay facturas generadas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo de AFIP */}
      <Dialog open={showAfipDialog} onOpenChange={setShowAfipDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar datos de AFIP</DialogTitle>
            <DialogDescription>
              Ingrese los datos obtenidos de AFIP para esta factura
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="afip-numero" className="text-right">
                Número
              </Label>
              <Input
                id="afip-numero"
                value={afipData.numeroFactura}
                onChange={(e) => setAfipData(prev => ({...prev, numeroFactura: e.target.value}))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="afip-cae" className="text-right">
                CAE
              </Label>
              <Input
                id="afip-cae"
                value={afipData.cae}
                onChange={(e) => setAfipData(prev => ({...prev, cae: e.target.value}))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="afip-vencimiento" className="text-right">
                Vencimiento
              </Label>
              <Input
                id="afip-vencimiento"
                type="date"
                value={afipData.caeVencimiento}
                onChange={(e) => setAfipData(prev => ({...prev, caeVencimiento: e.target.value}))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowAfipDialog(false)} variant="outline">
              Cancelar
            </Button>
            <Button onClick={() => console.log('Actualizar AFIP')}>
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;