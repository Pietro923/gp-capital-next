// ===== INTERFACES PARA DASHBOARD =====

// Interfaces para las relaciones de Supabase
interface ClienteRelacion {
  nombre: string;
  apellido?: string;
  tipo_cliente: 'EMPRESA' | 'PERSONA';
  empresa?: string;
}

interface ProveedorRelacion {
  nombre: string;
  cuit?: string;
}

interface TipoIvaRelacion {
  nombre: string;
}

interface FormaPagoRelacion {
  nombre: string;
}

interface PrestamoRelacion {
  cliente_id: string;
  monto_total: number;
  cliente: ClienteRelacion;
}

interface CuotaRelacion {
  numero_cuota: number;
  prestamo: PrestamoRelacion;
}

// Interfaces para datos de facturación
interface FacturaDetalle {
  fecha_emision: string;
  numero_factura: string;
  punto_venta?: string;
  tipo_factura: string;
  total_factura: number;
  cliente: ClienteRelacion;
}

interface CompraDetalle {
  fecha_compra: string;
  numero_factura: string;
  punto_venta?: string;
  tipo_factura: string;
  total_factura: number;
  proveedor: ProveedorRelacion;
}

interface PrestamoDetalle {
  id: string;
  fecha_inicio: string;
  monto_total: number;
  tasa_interes: number;
  cantidad_cuotas: number;
  estado: string;
  cliente: ClienteRelacion;
}

interface CuotaDetalle {
  fecha_vencimiento: string;
  numero_cuota: number;
  monto: number;
  estado: string;
  fecha_pago?: string;
  prestamo: PrestamoRelacion;
}

interface PagoDetalle {
  fecha_pago: string;
  monto: number;
  metodo_pago: string;
  comprobante?: string;
  cuota: CuotaRelacion;
}

// ===== INTERFACES PARA PAYMENT MANAGEMENT =====

interface ProveedorPayment {
  id: string;
  nombre: string;
  cuit: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  tipos_iva: TipoIvaRelacion[];
}

interface CompraPayment {
  id: string;
  numero_factura: string;
  fecha_compra: string;
  total_factura: number;
  monto_pagado: number;
  estado_pago: 'PENDIENTE' | 'PAGADO_PARCIAL' | 'PAGADO_TOTAL';
  fecha_vencimiento?: string;
  formas_pago: FormaPagoRelacion[];
}

interface OrdenPagoData {
  id: string;
  numero_orden: string;
  fecha_emision: string;
  monto_total: number;
  estado: string;
  numero_operacion?: string;
  fecha_pago?: string;
  observaciones?: string;
  proveedores: ProveedorRelacion[];
  formas_pago: FormaPagoRelacion[];
}

interface OrdenPagoDetalle {
  monto_total: number;
  numero_orden: string;
  proveedores: ProveedorRelacion[];
  orden_pago_compras: {
    compra_id: string;
    monto_asignado: number;
  }[];
}

// ===== FUNCIONES HELPER PARA EXTRAER DATOS =====

// Helper para obtener nombre del cliente
export const obtenerNombreCliente = (cliente: ClienteRelacion | null): string => {
  if (!cliente) return 'Cliente no encontrado';
  
  if (cliente.tipo_cliente === 'EMPRESA') {
    return cliente.empresa || cliente.nombre;
  }
  
  return `${cliente.apellido || ''}, ${cliente.nombre || ''}`.trim();
};

// Helper para obtener nombre del proveedor
export const obtenerNombreProveedor = (proveedor: ProveedorRelacion | null): string => {
  return proveedor?.nombre || 'Proveedor no encontrado';
};

// Helper para obtener primer elemento de array (para relaciones de Supabase)
export const obtenerPrimero = <T>(items: T[] | T | null | undefined): T | null => {
  if (!items) return null;
  if (Array.isArray(items)) {
    return items.length > 0 ? items[0] : null;
  }
  return items;
};

// ===== EXPORTS DE INTERFACES =====
export type {
  ClienteRelacion,
  ProveedorRelacion,
  TipoIvaRelacion,
  FormaPagoRelacion,
  PrestamoRelacion,
  CuotaRelacion,
  FacturaDetalle,
  CompraDetalle,
  PrestamoDetalle,
  CuotaDetalle,
  PagoDetalle,
  ProveedorPayment,
  CompraPayment,
  OrdenPagoData,
  OrdenPagoDetalle
};