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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Receipt, Trash2, Download, CheckCircle, FileText } from "lucide-react";
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
  numeroFactura: string; // Nueva propiedad
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
    total: 0
  });

  // Estados para los datos de la factura
  const [formData, setFormData] = useState<FacturaFormData>({
    tipoFactura: '',
    clienteId: '',
    tipoIvaId: '',
    formaPagoId: '',
    puntoVenta: '0001',
    numeroFactura: '', // Inicializar la nueva propiedad
  });

  // Estados para los datos externos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tiposIva, setTiposIva] = useState<TipoIva[]>([]);
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
  const [facturaIdToUpdate, setFacturaIdToUpdate] = useState<string | null>(null);

  // Cargar datos necesarios
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar clientes con información de condición IVA
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('*, tipo_iva:tipo_iva_id(nombre)');
        if (clientesData) setClientes(clientesData);
        
        // Cargar tipos de IVA
        const { data: tiposIvaData } = await supabase
          .from('tipos_iva')
          .select('*');
        if (tiposIvaData) setTiposIva(tiposIvaData);
        
        // Cargar formas de pago
        const { data: formasPagoData } = await supabase
          .from('formas_pago')
          .select('*');
        if (formasPagoData) setFormasPago(formasPagoData);
        
        // Cargar historial de facturas
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

  // Manejar items de la factura
  const handleAddItem = () => {
    if (newItem.description && newItem.quantity && newItem.unitPrice) {
      setItems([...items, {
        ...newItem,
        total: newItem.quantity * newItem.unitPrice
      }]);
      setNewItem({
        description: '',
        quantity: 0,
        unitPrice: 0,
        total: 0
      });
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + item.total, 0);
  
  // Calcular IVA según condición del cliente
  const calcularIVA = (total: number, tipoIvaId: string) => {
    // Buscar el tipo de IVA en el array de tiposIva
    const tipoIva = tiposIva.find(t => t.id === tipoIvaId);
    
    if (!tipoIva) {
      console.error('Tipo de IVA no encontrado para ID:', tipoIvaId);
      return {
        totalNeto: total,
        iva: 0,
        porcentajeIVA: 0
      };
    }
  
    // Convertir el porcentaje_iva de la base de datos a decimal
    const porcentajeIVA = tipoIva.porcentaje_iva / 100;
    
    // Si el porcentaje es 0 (exento)
    if (porcentajeIVA === 0) {
      return {
        totalNeto: total,
        iva: 0,
        porcentajeIVA: tipoIva.porcentaje_iva
      };
    }
    
    // Cálculo normal
    const totalNeto = total / (1 + porcentajeIVA);
    const iva = total - totalNeto;
    
    return {
      totalNeto,
      iva,
      porcentajeIVA: tipoIva.porcentaje_iva
    };
  };

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
      const fecha = new Date(facturaData.created_at).toLocaleDateString();
      
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
          const fechaVencimiento = new Date(facturaData.cae_vencimiento).toLocaleDateString();
          doc.text(`Vencimiento CAE: ${fechaVencimiento}`, 105, 55, { align: 'center' });
        }
      }
      
      // Datos del emisor
      doc.setFontSize(10);
      doc.text('GP CAPITAL S.A.', 14, 60);
      doc.text('CUIT: 30-12345678-9', 14, 65);
      doc.text('Dirección: Av. Siempreviva 742', 14, 70);
      
      // Datos del cliente
      doc.text(`Cliente: ${facturaData.cliente.nombre} ${facturaData.cliente.apellido}`, 14, 85);
      doc.text(`DNI/CUIT: ${facturaData.cliente.cuit || facturaData.cliente.dni}`, 14, 90);
      doc.text(`Dirección: ${facturaData.cliente.direccion}`, 14, 95);
      doc.text(`Condición IVA: ${facturaData.cliente.tipo_iva?.nombre || facturaData.tipo_iva.nombre}`, 14, 100);
      doc.text(`Forma de Pago: ${facturaData.forma_pago.nombre}`, 14, 105);
      
      // Tabla de items
      const tableColumn = ["Descripción", "Cantidad", "Precio Unit.", "Subtotal"];
      const tableRows = detallesData.map(detalle => [
        detalle.descripcion,
        detalle.cantidad,
        `$${detalle.precio_unitario.toFixed(2)}`,
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
      doc.text(`IVA (21%): $${facturaData.iva.toFixed(2)}`, 140, finalY + 7);
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

  // Actualizar factura con datos de AFIP
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

  // Generar factura
  const handleGenerarFactura = async () => {
    if (!formData.tipoFactura || !formData.clienteId || !formData.tipoIvaId || !formData.formaPagoId || items.length === 0) {
      setError('Por favor complete todos los campos necesarios');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Calcular IVA según condición del cliente
      const { totalNeto, iva } = calcularIVA(total, formData.tipoIvaId);
      
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
    iva: iva,
    total_factura: total,
    punto_venta: formData.puntoVenta,
    numero_factura: formData.numeroFactura ? parseInt(formData.numeroFactura) : null, // Añadir número de factura
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
              subtotal: item.total
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
        puntoVenta: formData.puntoVenta, // Mantener el punto de venta
        numeroFactura: '', // Inicializar la nueva propiedad
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
                <CardDescription>Agregue los productos o servicios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4 items-end mb-4">
                  <div>
                    <Label htmlFor="itemDescription">Descripción</Label>
                    <Input
                      id="itemDescription"
                      value={newItem.description}
                      onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                      placeholder="Descripción del item"
                    />
                  </div>
                  <div>
                    <Label htmlFor="itemQuantity">Cantidad</Label>
                    <Input
                      id="itemQuantity"
                      type="number"
                      value={newItem.quantity || ''}
                      onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value), total: Number(e.target.value) * newItem.unitPrice})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="itemPrice">Precio Unitario</Label>
                    <Input
                      id="itemPrice"
                      type="number"
                      value={newItem.unitPrice || ''}
                      onChange={(e) => setNewItem({...newItem, unitPrice: Number(e.target.value), total: newItem.quantity * Number(e.target.value)})}
                      placeholder="0.00"
                    />
                  </div>
                  <Button 
                    onClick={handleAddItem}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Agregar Item
                  </Button>
                </div>
                
                {items.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">P. Unitario</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${item.total.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-bold">Total:</TableCell>
                          <TableCell className="text-right font-bold">${total.toFixed(2)}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No hay items agregados
                  </div>
                )}
                {items.length > 0 && (
  <div className="mt-4 p-4 border rounded-md">
  <h3 className="font-medium mb-2">Resumen de Impuestos</h3>
  <div className="grid grid-cols-3 gap-4">
    <div>
      <Label>Neto</Label>
      <div className="mt-1 font-medium">
        ${calcularIVA(total, formData.tipoIvaId).totalNeto.toFixed(2)}
      </div>
    </div>
    <div>
      <Label>IVA ({calcularIVA(total, formData.tipoIvaId).porcentajeIVA}%)</Label>
      <div className="mt-1 font-medium">
        ${calcularIVA(total, formData.tipoIvaId).iva.toFixed(2)}
      </div>
    </div>
    <div>
      <Label>Total</Label>
      <div className="mt-1 font-medium">
        ${total.toFixed(2)}
      </div>
    </div>
  </div>
</div>
)}
              </CardContent>
            </Card>
            
            <div className="flex justify-end gap-4">
              <Button
                className="flex items-center gap-2"
                disabled={items.length === 0 || !formData.tipoFactura || !formData.clienteId || !formData.formaPagoId || isLoading}
                onClick={handleGenerarFactura}
              >
                <Receipt className="h-4 w-4" />
                {isLoading ? 'Generando...' : 'Generar Factura'}
              </Button>
            </div>
            
            {error && (
              <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <CardTitle>Facturas Emitidas</CardTitle>
              <CardDescription>Historial de las últimas facturas emitidas</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="text-center py-4">Cargando historial...</div>
              ) : facturas.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturas.map((factura) => (
                        <TableRow key={factura.id}>
                          <TableCell>Factura {factura.tipo_factura}</TableCell>
                          <TableCell>{factura.punto_venta}-{String(factura.numero_factura).padStart(8, '0')}</TableCell>
                          <TableCell>{new Date(factura.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{factura.cliente.nombre} {factura.cliente.apellido}</TableCell>
                          <TableCell className="text-right">${factura.total_factura.toFixed(2)}</TableCell>
                          <TableCell>{getEstadoFactura(factura)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2"
                                onClick={() => generatePDF(factura.id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2"
                                onClick={() => openAfipDialog(factura)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No hay facturas emitidas
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Diálogo para actualizar datos de AFIP */}
      <Dialog open={showAfipDialog} onOpenChange={setShowAfipDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar datos de factura</DialogTitle>
            <DialogDescription>
              Ingrese los datos oficiales para registrar la factura
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="numeroFactura">Número de factura</Label>
              <Input
                id="numeroFactura"
                value={afipData.numeroFactura}
                onChange={(e) => setAfipData({...afipData, numeroFactura: e.target.value})}
                placeholder="Número de factura"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cae">CAE</Label>
              <Input
                id="cae"
                value={afipData.cae}
                onChange={(e) => setAfipData({...afipData, cae: e.target.value})}
                placeholder="CAE"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="caeVencimiento">Vencimiento CAE</Label>
              <Input
                id="caeVencimiento"
                type="date"
                value={afipData.caeVencimiento}
                onChange={(e) => setAfipData({...afipData, caeVencimiento: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="afipCargada" defaultChecked />
                <Label htmlFor="afipCargada">Marcar como registrada</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAfipDialog(false)}>Cancelar</Button>
            <Button onClick={handleUpdateAfipData}>Guardar datos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;