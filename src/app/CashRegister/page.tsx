"use client";
import React, { useState, useEffect } from "react";
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
import { Search, Loader2, Building2, Wallet, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MovimientoCaja {
  id: string;
  tipo: "INGRESO" | "EGRESO";
  concepto: string;
  monto: number;
  fecha_movimiento: string;
  created_at: string;
}

interface MovimientoBanco {
  id: string;
  tipo: "INGRESO" | "EGRESO" | "GASTO_BANCARIO";
  concepto: string;
  monto: number;
  fecha_movimiento: string;
  numero_operacion?: string;
  detalle_gastos?: string;
  created_at: string;
}

interface NewMovementForm {
  tipo: "INGRESO" | "EGRESO";
  concepto: string;
  monto: number;
  fecha_movimiento: string;  // Agregar esta línea
}

interface NewBankMovementForm {
  tipo: "INGRESO" | "EGRESO" | "GASTO_BANCARIO";
  concepto: string;
  monto: number;
  numero_operacion: string;
  detalle_gastos: string;
  fecha_movimiento: string;  // Agregar esta línea
}

const initialFormState: NewMovementForm = {
  tipo: "INGRESO",
  concepto: "",
  monto: 0,
  fecha_movimiento: new Date().toISOString().split('T')[0],
};

const initialBankFormState: NewBankMovementForm = {
  tipo: "INGRESO",
  concepto: "",
  monto: 0,
  numero_operacion: "",
  detalle_gastos: "",
  fecha_movimiento: new Date().toISOString().split('T')[0],
};

interface EditMovementForm extends NewMovementForm {
  id: string;
  fecha_movimiento: string;
}

interface EditBankMovementForm extends NewBankMovementForm {
  id: string;
  fecha_movimiento: string;
}

const CashRegister: React.FC = () => {
  const [activeTab, setActiveTab] = useState("caja");
  const [searchTerm, setSearchTerm] = useState("");
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [movimientosBanco, setMovimientosBanco] = useState<MovimientoBanco[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [formData, setFormData] = useState<NewMovementForm>(initialFormState);
  const [bankFormData, setBankFormData] = useState<NewBankMovementForm>(initialBankFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [currentBankBalance, setCurrentBankBalance] = useState(0);

  // Para la edicion
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditBankDialogOpen, setIsEditBankDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<EditMovementForm | null>(null);
  const [editBankFormData, setEditBankFormData] = useState<EditBankMovementForm | null>(null);

  // Obtener movimientos de caja
  const fetchMovimientos = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("movimientos_caja")
        .select("*")
        .eq('eliminado', false)  // Agregar esta línea
        .order("fecha_movimiento", { ascending: false });

      if (error) throw error;
      setMovimientos(data || []);
    } catch (error) {
      console.error("Error fetching movimientos:", error);
      setError("Error al cargar los movimientos de caja");
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener movimientos de banco
  const fetchMovimientosBanco = async () => {
    try {
      const { data, error } = await supabase
        .from("movimientos_banco")
        .select("*")
        .order("fecha_movimiento", { ascending: false });

      if (error) throw error;
      setMovimientosBanco(data || []);
    } catch (error) {
      console.error("Error fetching movimientos banco:", error);
      setError("Error al cargar los movimientos de banco");
    }
  };

  // Obtener el saldo actual
  const fetchCurrentBalance = async () => {
    try {
      const { data, error } = await supabase
        .from("saldo_caja")
        .select("saldo_actual")
        .single();

      if (error) throw error;
      setCurrentBalance(data.saldo_actual);
    } catch (error) {
      console.error("Error fetching current balance:", error);
    }
  };

  // Obtener el saldo bancario actual
  const fetchCurrentBankBalance = async () => {
    try {
      const { data, error } = await supabase
        .from("saldo_banco")
        .select("saldo_actual")
        .single();

      if (error) throw error;
      setCurrentBankBalance(data.saldo_actual);
    } catch (error) {
      console.error("Error fetching current bank balance:", error);
    }
  };

  // Modificar handleInputChange para incluir fecha_movimiento
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData((prev) => ({
    ...prev,
    [name]: name === 'monto' ? Number(value) : value,
  }));
};

  // Modificar handleBankInputChange para incluir fecha_movimiento
const handleBankInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  setBankFormData((prev) => ({
    ...prev,
    [name]: name === 'monto' ? Number(value) : value,
  }));
};

  // Manejar cambios en el select
  const handleSelectChange = (value: "INGRESO" | "EGRESO") => {
    setFormData((prev) => ({
      ...prev,
      tipo: value,
    }));
  };

  // Manejar cambios en el select del banco
  const handleBankSelectChange = (value: "INGRESO" | "EGRESO" | "GASTO_BANCARIO") => {
    setBankFormData((prev) => ({
      ...prev,
      tipo: value,
    }));
  };

  // Agregar un nuevo movimiento
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const { data, error } = await supabase
        .from("movimientos_caja")
        .insert([
          {
            ...formData,
            fecha_movimiento: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      setMovimientos((prev) => [data[0], ...prev]);
      setFormData(initialFormState);
      setIsDialogOpen(false);
      fetchCurrentBalance(); // Actualizar el saldo
    } catch (error) {
      console.error("Error al agregar movimiento:", error);
      setFormError("Error al agregar el movimiento. Por favor, intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Agregar un nuevo movimiento bancario
  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const { data, error } = await supabase
        .from("movimientos_banco")
        .insert([
          {
            ...bankFormData,
            fecha_movimiento: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      setMovimientosBanco((prev) => [data[0], ...prev]);
      setBankFormData(initialBankFormState);
      setIsBankDialogOpen(false);
      fetchCurrentBankBalance(); // Actualizar el saldo
    } catch (error) {
      console.error("Error al agregar movimiento bancario:", error);
      setFormError("Error al agregar el movimiento. Por favor, intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchMovimientos();
    fetchCurrentBalance();
    fetchMovimientosBanco();
    fetchCurrentBankBalance();
  }, []);

  // Filtrar movimientos
  const filteredMovimientos = movimientos.filter((movimiento) =>
    movimiento.concepto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrar movimientos bancarios
  const filteredMovimientosBanco = movimientosBanco.filter((movimiento) =>
    movimiento.concepto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Cargando movimientos...</div>;
  }

  if (error) {
    return <div className="text-red-600 p-4">{error}</div>;
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "INGRESO":
        return "text-green-600";
      case "EGRESO":
        return "text-red-600";
      case "GASTO_BANCARIO":
        return "text-orange-600";
      default:
        return "";
    }
  };

  const formatTipo = (tipo: string) => {
    switch (tipo) {
      case "GASTO_BANCARIO":
        return "GASTO BANCARIO";
      default:
        return tipo;
    }
  };

  // Función para abrir edición de movimiento
const handleEditMovement = (movimiento: MovimientoCaja) => {
  setEditFormData({
    id: movimiento.id,
    tipo: movimiento.tipo,
    concepto: movimiento.concepto,
    monto: movimiento.monto,
    fecha_movimiento: movimiento.fecha_movimiento.split('T')[0],
  });
  setIsEditDialogOpen(true);
};

const handleEditBankMovement = (movimiento: MovimientoBanco) => {
  setEditBankFormData({
    id: movimiento.id,
    tipo: movimiento.tipo,
    concepto: movimiento.concepto,
    monto: movimiento.monto,
    numero_operacion: movimiento.numero_operacion || "",
    detalle_gastos: movimiento.detalle_gastos || "",
    fecha_movimiento: movimiento.fecha_movimiento.split('T')[0],
  });
  setIsEditBankDialogOpen(true);
};

// Función para guardar edición
const handleUpdateMovement = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editFormData) return;
  
  setIsSubmitting(true);
  setFormError(null);
  
  try {
    const { error } = await supabase
      .from("movimientos_caja")
      .update({
        tipo: editFormData.tipo,
        concepto: editFormData.concepto,
        monto: editFormData.monto,
        fecha_movimiento: editFormData.fecha_movimiento,
      })
      .eq('id', editFormData.id);

    if (error) throw error;
    
    fetchMovimientos();
    fetchCurrentBalance();
    setIsEditDialogOpen(false);
    setEditFormData(null);
  } catch (error) {
  console.error("Error updating movement:", error);
  setFormError("Error al actualizar el movimiento");
} finally {
    setIsSubmitting(false);
  }
};

// Función para guardar edición bancaria
const handleUpdateBankMovement = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editBankFormData) return;
  
  setIsSubmitting(true);
  setFormError(null);
  
  try {
    const { error } = await supabase
      .from("movimientos_banco")
      .update({
        tipo: editBankFormData.tipo,
        concepto: editBankFormData.concepto,
        monto: editBankFormData.monto,
        numero_operacion: editBankFormData.numero_operacion,
        detalle_gastos: editBankFormData.detalle_gastos,
        fecha_movimiento: editBankFormData.fecha_movimiento,
      })
      .eq('id', editBankFormData.id);

    if (error) throw error;
    
    fetchMovimientosBanco();
    fetchCurrentBankBalance();
    setIsEditBankDialogOpen(false);
    setEditBankFormData(null);
  } catch (error) {
  console.error("Error updating bank movement:", error);
  setFormError("Error al actualizar el movimiento");
} finally {
    setIsSubmitting(false);
  }
};

// Función para eliminar movimiento
const handleDeleteMovement = async (id: string) => {
  if (!confirm('¿Está seguro de eliminar este movimiento?')) return;
  
  try {
    const { error } = await supabase
      .from("movimientos_caja")
      .update({ 
        eliminado: true, 
        fecha_eliminacion: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) throw error;
    
    fetchMovimientos();
    fetchCurrentBalance();
  } catch (error) {
  console.error("Error deleting movement:", error);
  setError("Error al eliminar el movimiento");
}
};

// Función para eliminar movimiento bancario
const handleDeleteBankMovement = async (id: string) => {
  if (!confirm('¿Está seguro de eliminar este movimiento?')) return;
  
  try {
    const { error } = await supabase
      .from("movimientos_banco")
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    fetchMovimientosBanco();
    fetchCurrentBankBalance();
  } catch (error) {
  console.error("Error deleting bank movement:", error);
  setError("Error al eliminar el movimiento");
}
};

// Agregar estos handlers para edición
const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  if (editFormData) {
    setEditFormData((prev) => prev ? ({
      ...prev,
      [name]: name === 'monto' ? Number(value) : value,
    }) : null);
  }
};

const handleEditBankInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  if (editBankFormData) {
    setEditBankFormData((prev) => prev ? ({
      ...prev,
      [name]: name === 'monto' ? Number(value) : value,
    }) : null);
  }
};

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Gestión Financiera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="caja" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Caja
              </TabsTrigger>
              <TabsTrigger value="banco" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Banco
              </TabsTrigger>
            </TabsList>

            {/* TAB DE CAJA */}
            <TabsContent value="caja" className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
                <h3 className="text-lg font-semibold">Movimientos de Caja</h3>
                <div className="flex space-x-2">
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
                        Nuevo Movimiento
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6">
                      <DialogHeader>
                        <DialogTitle>Nuevo Movimiento</DialogTitle>
                        <DialogDescription>
                          Registre un nuevo ingreso o egreso
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                        <div className="space-y-2">
                          <Label htmlFor="tipo-movimiento">Tipo de Movimiento</Label>
                          <Select
                            value={formData.tipo}
                            onValueChange={(value) => 
                              handleSelectChange(value as "INGRESO" | "EGRESO")
                            }
                          >
                            <SelectTrigger id="tipo-movimiento" className="w-full">
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INGRESO">Ingreso</SelectItem>
                              <SelectItem value="EGRESO">Egreso</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fecha">Fecha del Movimiento</Label>
                          <Input
                            id="fecha"
                            name="fecha_movimiento"
                            type="date"
                            required
                            value={formData.fecha_movimiento}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="concepto">Concepto</Label>
                          <Input
                            id="concepto"
                            name="concepto"
                            required
                            value={formData.concepto}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="monto">Monto</Label>
                          <Input
                            id="monto"
                            name="monto"
                            type="number"
                            required
                            value={formData.monto}
                            onChange={handleInputChange}
                          />
                        </div>
                        {formError && (
                          <Alert variant="destructive">
                            <AlertDescription>{formError}</AlertDescription>
                          </Alert>
                        )}
                        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            className="w-full sm:w-auto"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full sm:w-auto"
                          >
                            {isSubmitting && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Guardar Movimiento
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <div className="flex flex-col space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Buscar por concepto..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMovimientos.map((movimiento) => (
                        <TableRow key={movimiento.id} className="hover:bg-slate-50">
                          <TableCell className="hidden sm:table-cell">
                            {new Date(movimiento.fecha_movimiento).toLocaleDateString()}
                          </TableCell>
                          <TableCell
                            className={getTipoColor(movimiento.tipo)}
                          >
                            {movimiento.tipo}
                          </TableCell>
                          <TableCell className="max-w-[150px] sm:max-w-none truncate">
                            {movimiento.concepto}
                          </TableCell>
                          <TableCell>${movimiento.monto.toLocaleString()}</TableCell>
                          <TableCell>
  <div className="flex gap-1">
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => handleEditMovement(movimiento)}
    >
      <Pencil className="h-4 w-4" />
    </Button>
    <Button 
      variant="ghost" 
      size="sm" 
      className="text-red-600"
      onClick={() => handleDeleteMovement(movimiento.id)}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Saldo Actual</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">${currentBalance.toLocaleString()}</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB DE BANCO */}
            <TabsContent value="banco" className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
                <h3 className="text-lg font-semibold">Movimientos Bancarios</h3>
                <div className="flex space-x-2">
                  <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
                        Nuevo Movimiento
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6">
                      <DialogHeader>
                        <DialogTitle>Nuevo Movimiento Bancario</DialogTitle>
                        <DialogDescription>
                          Registre un nuevo movimiento bancario
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleBankSubmit} className="space-y-4 mt-2">
                        <div className="space-y-2">
                          <Label htmlFor="banco-tipo-movimiento">Tipo de Movimiento</Label>
                          <Select
                            value={bankFormData.tipo}
                            onValueChange={(value) => 
                              handleBankSelectChange(value as "INGRESO" | "EGRESO" | "GASTO_BANCARIO")
                            }
                          >
                            <SelectTrigger id="banco-tipo-movimiento" className="w-full">
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INGRESO">Ingreso</SelectItem>
                              <SelectItem value="EGRESO">Egreso</SelectItem>
                              <SelectItem value="GASTO_BANCARIO">Gasto Bancario</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fecha">Fecha del Movimiento</Label>
                          <Input
                            id="fecha"
                            name="fecha_movimiento"
                            type="date"
                            required
                            value={formData.fecha_movimiento}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="banco-concepto">Concepto</Label>
                          <Input
                            id="banco-concepto"
                            name="concepto"
                            required
                            value={bankFormData.concepto}
                            onChange={handleBankInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="banco-monto">Monto</Label>
                          <Input
                            id="banco-monto"
                            name="monto"
                            type="number"
                            required
                            value={bankFormData.monto}
                            onChange={handleBankInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="banco-operacion">Número de Operación</Label>
                          <Input
                            id="banco-operacion"
                            name="numero_operacion"
                            value={bankFormData.numero_operacion}
                            onChange={handleBankInputChange}
                            placeholder="Opcional"
                          />
                        </div>
                        {bankFormData.tipo === "GASTO_BANCARIO" && (
                          <div className="space-y-2">
                            <Label htmlFor="banco-detalle">Detalle de Gastos/Impuestos</Label>
                            <textarea
                              id="banco-detalle"
                              name="detalle_gastos"
                              placeholder="Detalle los impuestos y gastos bancarios..."
                              value={bankFormData.detalle_gastos}
                              onChange={handleBankInputChange}
                              className="w-full p-2 border border-gray-300 rounded-md min-h-[80px] resize-vertical"
                              rows={3}
                            />
                          </div>
                        )}
                        {formError && (
                          <Alert variant="destructive">
                            <AlertDescription>{formError}</AlertDescription>
                          </Alert>
                        )}
                        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsBankDialogOpen(false)}
                            className="w-full sm:w-auto"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full sm:w-auto"
                          >
                            {isSubmitting && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Guardar Movimiento
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                {/* Dialog para Editar Movimiento de Caja */}
<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
  <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6">
    <DialogHeader>
      <DialogTitle>Editar Movimiento</DialogTitle>
      <DialogDescription>
        Modifique los datos del movimiento
      </DialogDescription>
    </DialogHeader>
    {editFormData && (
      <form onSubmit={handleUpdateMovement} className="space-y-4 mt-2">
        <div className="space-y-2">
          <Label htmlFor="edit-tipo-movimiento">Tipo de Movimiento</Label>
          <Select
            value={editFormData.tipo}
            onValueChange={(value) => 
              setEditFormData({...editFormData, tipo: value as "INGRESO" | "EGRESO"})
            }
          >
            <SelectTrigger id="edit-tipo-movimiento" className="w-full">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INGRESO">Ingreso</SelectItem>
              <SelectItem value="EGRESO">Egreso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-fecha">Fecha del Movimiento</Label>
          <Input
            id="edit-fecha"
            name="fecha_movimiento"
            type="date"
            required
            value={editFormData.fecha_movimiento}
            onChange={handleEditInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-concepto">Concepto</Label>
          <Input
            id="edit-concepto"
            name="concepto"
            required
            value={editFormData.concepto}
            onChange={handleEditInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-monto">Monto</Label>
          <Input
            id="edit-monto"
            name="monto"
            type="number"
            required
            value={editFormData.monto}
            onChange={handleEditInputChange}
          />
        </div>
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditDialogOpen(false)}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </form>
    )}
  </DialogContent>
</Dialog>

{/* Dialog para Editar Movimiento Bancario */}
<Dialog open={isEditBankDialogOpen} onOpenChange={setIsEditBankDialogOpen}>
  <DialogContent className="sm:max-w-md max-w-[95vw] p-4 sm:p-6">
    <DialogHeader>
      <DialogTitle>Editar Movimiento Bancario</DialogTitle>
      <DialogDescription>
        Modifique los datos del movimiento bancario
      </DialogDescription>
    </DialogHeader>
    {editBankFormData && (
      <form onSubmit={handleUpdateBankMovement} className="space-y-4 mt-2">
        <div className="space-y-2">
          <Label htmlFor="edit-banco-tipo-movimiento">Tipo de Movimiento</Label>
          <Select
            value={editBankFormData.tipo}
            onValueChange={(value) => 
              setEditBankFormData({...editBankFormData, tipo: value as "INGRESO" | "EGRESO" | "GASTO_BANCARIO"})
            }
          >
            <SelectTrigger id="edit-banco-tipo-movimiento" className="w-full">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INGRESO">Ingreso</SelectItem>
              <SelectItem value="EGRESO">Egreso</SelectItem>
              <SelectItem value="GASTO_BANCARIO">Gasto Bancario</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-banco-fecha">Fecha del Movimiento</Label>
          <Input
            id="edit-banco-fecha"
            name="fecha_movimiento"
            type="date"
            required
            value={editBankFormData.fecha_movimiento}
            onChange={handleEditBankInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-banco-concepto">Concepto</Label>
          <Input
            id="edit-banco-concepto"
            name="concepto"
            required
            value={editBankFormData.concepto}
            onChange={handleEditBankInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-banco-monto">Monto</Label>
          <Input
            id="edit-banco-monto"
            name="monto"
            type="number"
            required
            value={editBankFormData.monto}
            onChange={handleEditBankInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-banco-operacion">Número de Operación</Label>
          <Input
            id="edit-banco-operacion"
            name="numero_operacion"
            value={editBankFormData.numero_operacion}
            onChange={handleEditBankInputChange}
            placeholder="Opcional"
          />
        </div>
        {editBankFormData.tipo === "GASTO_BANCARIO" && (
          <div className="space-y-2">
            <Label htmlFor="edit-banco-detalle">Detalle de Gastos/Impuestos</Label>
            <textarea
              id="edit-banco-detalle"
              name="detalle_gastos"
              placeholder="Detalle los impuestos y gastos bancarios..."
              value={editBankFormData.detalle_gastos}
              onChange={handleEditBankInputChange}
              className="w-full p-2 border border-gray-300 rounded-md min-h-[80px] resize-vertical"
              rows={3}
            />
          </div>
        )}
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditBankDialogOpen(false)}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </form>
    )}
  </DialogContent>
</Dialog>
              </div>
              
              <div className="flex flex-col space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Buscar por concepto..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead className="hidden md:table-cell">N° Operación</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMovimientosBanco.map((movimiento) => (
                        <TableRow key={movimiento.id} className="hover:bg-slate-50">
                          <TableCell className="hidden sm:table-cell">
                            {new Date(movimiento.fecha_movimiento).toLocaleDateString()}
                          </TableCell>
                          <TableCell
                            className={getTipoColor(movimiento.tipo)}
                          >
                            {formatTipo(movimiento.tipo)}
                          </TableCell>
                          <TableCell className="max-w-[150px] sm:max-w-none truncate">
                            {movimiento.concepto}
                          </TableCell>
                          <TableCell>${movimiento.monto.toLocaleString()}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {movimiento.numero_operacion || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleEditBankMovement(movimiento)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600"
                                onClick={() => handleDeleteBankMovement(movimiento.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Saldo Bancario</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">${currentBankBalance.toLocaleString()}</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashRegister;