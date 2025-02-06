"use client"
import React, { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Receipt, 
  Calculator, 
  Building2, 
  ClipboardList, 
  Menu,
  UserCheck,
  CreditCard,
  ShoppingCart,
  DollarSign,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// Definición de tipos
interface Section {
  id: "clientes" | "cuotas" | "simulador" | "analisis" | "proveedores" | "facturacion" | "compras" | "caja";
  name: string;
  icon: LucideIcon;
  href: string;
  description: string;
}

const sections: Section[] = [
  { 
    id: "clientes", 
    name: "Listado de Clientes", 
    icon: Users, 
    href: "/ClientList",
    description: "Gestión y seguimiento de solicitantes de créditos"
  },
  { 
    id: "cuotas", 
    name: "Detalle de Cuotas", 
    icon: ClipboardList, 
    href: "/LoanDetails",
    description: "Seguimiento de pagos y cuotas de préstamos"
  },
  { 
    id: "simulador", 
    name: "Simulador de Préstamos", 
    icon: Calculator, 
    href: "/LoanSimulator",
    description: "Simulación de préstamos con diferentes condiciones"
  },
  { 
    id: "analisis", 
    name: "Análisis de Clientes", 
    icon: UserCheck, 
    href: "/ClientAnalysis",
    description: "Evaluación de aptitud crediticia"
  },
  { 
    id: "proveedores", 
    name: "Proveedores", 
    icon: Building2, 
    href: "/Providers",
    description: "Gestión de empresas del Grupo Pueble"
  },
  { 
    id: "facturacion", 
    name: "Facturación AFIP", 
    icon: Receipt, 
    href: "/Billing",
    description: "Generación de facturas tipo A/B"
  },
  { 
    id: "compras", 
    name: "Compras", 
    icon: ShoppingCart, 
    href: "/Purchases",
    description: "Gestión de compras"
  },
  { 
    id: "caja", 
    name: "Caja", 
    icon: DollarSign, 
    href: "/CashRegister",
    description: "Gestión de Caja"
  },
];

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<Section["id"]>("clientes");

  const handleSectionChange = (sectionId: Section["id"]) => {
    setCurrentSection(sectionId);
    setIsOpen(false); // Cerrar el Sheet en móvil después de seleccionar una sección
  };

  return (
    <div>
      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>GP Capital</SheetTitle>
          </SheetHeader>
          <nav className="mt-4">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <a 
                  key={section.id} 
                  href={section.href}
                  className={cn(
                    "flex items-center p-2 hover:bg-accent rounded-md transition-colors",
                    currentSection === section.id ? "bg-accent" : ""
                  )}
                  onClick={() => handleSectionChange(section.id)}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  {section.name}
                </a>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 bg-white border-r h-screen fixed left-0 top-0 p-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <h1 className="font-bold text-gray-600 text-xl">
              GP Capital
            </h1>
          </div>
        </div>
        <nav className="p-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <a
                key={section.id}
                href={section.href}
                className={cn(
                  "flex items-center p-2 hover:bg-accent rounded-md transition-colors mb-2",
                  currentSection === section.id ? "bg-accent" : ""
                )}
                onClick={() => handleSectionChange(section.id)}
              >
                <Icon className="mr-2 h-5 w-5" />
                {section.name}
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;