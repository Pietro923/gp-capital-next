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
import { Plus, Receipt, Trash2, Download } from "lucide-react";
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

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  direccion: string;
  dni: string;
}

interface TipoIva {
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
  cliente: { nombre: string; apellido: string; direccion: string; dni: string };
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
  });

  // Estados para los datos externos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tiposIva, setTiposIva] = useState<TipoIva[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setFacturaActual] = useState<FacturaData | null>(null);

  // Cargar datos necesarios
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar clientes
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('*');
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
      } catch (error) {
        console.error('Error cargando datos:', error);
        setError('Error al cargar los datos necesarios');
      }
    };
    fetchData();
  }, []);

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
          cliente:cliente_id(nombre, apellido, direccion, dni),
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
      doc.text(`Nº: ${facturaData.id}`, 105, 30, { align: 'center' });
      doc.text(`Fecha: ${fecha}`, 105, 40, { align: 'center' });
      
      // Datos del emisor
      doc.setFontSize(10);
      doc.text('EMPRESA S.A.', 14, 60);
      doc.text('CUIT: 30-12345678-9', 14, 65);
      doc.text('Dirección: Av. Siempreviva 742', 14, 70);
      
      // Datos del cliente
      doc.text(`Cliente: ${facturaData.cliente.nombre} ${facturaData.cliente.apellido}`, 14, 85);
      doc.text(`DNI/CUIT: ${facturaData.cliente.dni}`, 14, 90);
      doc.text(`Dirección: ${facturaData.cliente.direccion}`, 14, 95);
      doc.text(`Condición IVA: ${facturaData.tipo_iva.nombre}`, 14, 100);
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
      
      // Pie de página
      doc.setFontSize(8);
      doc.text('Documento no válido como factura oficial - Copia digital', 105, 280, { align: 'center' });
      
      // Descargar el PDF
      doc.save(`Factura_${facturaData.tipo_factura}_${facturaId}.pdf`);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF de la factura');
    }
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
      // Insertar la factura principal
      const { data: nuevaFactura, error: facturaError } = await supabase
        .from('facturacion')
        .insert([
          {
            tipo_factura: formData.tipoFactura,
            cliente_id: formData.clienteId,
            tipo_iva_id: formData.tipoIvaId,
            forma_pago_id: formData.formaPagoId,
            total_neto: total / 1.21, // Asumiendo IVA 21%
            iva: (total / 1.21) * 0.21,
            total_factura: total
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
      
      // Limpiar el formulario
      setItems([]);
      setFormData({
        tipoFactura: '',
        clienteId: '',
        tipoIvaId: '',
        formaPagoId: '',
      });
      
      alert('Factura generada exitosamente');
      
    } catch (error) {
      console.error('Error generando factura:', error);
      setError('Error al generar la factura');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Facturación AFIP
          </CardTitle>
          <CardDescription>
            Generación de facturas electrónicas tipo A/B
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Datos básicos de la factura */}
            <div className="space-y-4">
              <div>
                <Label>Tipo de Factura</Label>
                <Select onValueChange={(value) => handleFacturaDataChange('tipoFactura', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Factura A</SelectItem>
                    <SelectItem value="B">Factura B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Cliente</Label>
                <Select onValueChange={(value) => handleFacturaDataChange('clienteId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre} {cliente.apellido} - {cliente.dni}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Datos adicionales */}
            <div className="space-y-4">
              <div>
                <Label>Condición IVA</Label>
                <Select onValueChange={(value) => handleFacturaDataChange('tipoIvaId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar condición" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposIva.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pago</Label>
                <Select onValueChange={(value) => handleFacturaDataChange('formaPagoId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar forma de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {formasPago.map((forma) => (
                      <SelectItem key={forma.id} value={forma.id}>
                        {forma.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          {/* Items de la factura */}
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-5">
                <Input 
                  placeholder="Descripción"
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Input 
                  type="number"
                  placeholder="Cantidad"
                  value={newItem.quantity || ''}
                  onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                />
              </div>
              <div className="col-span-2">
                <Input 
                  type="number"
                  placeholder="Precio"
                  value={newItem.unitPrice || ''}
                  onChange={(e) => setNewItem({...newItem, unitPrice: Number(e.target.value)})}
                />
              </div>
              <div className="col-span-3">
                <Button 
                  className="w-full"
                  onClick={handleAddItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio Unit.</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell>${item.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-lg font-semibold">
                Total: ${total.toFixed(2)}
              </div>
              <Button 
                onClick={handleGenerarFactura}
                disabled={isLoading}
              >
                <Download className="mr-2 h-4 w-4" />
                {isLoading ? 'Generando...' : 'Generar Factura'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;