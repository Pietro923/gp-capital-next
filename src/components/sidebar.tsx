"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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
  ShoppingCart,
  DollarSign,
  SquareActivity,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  { id: "dashboard", name: "Dashboard", icon: SquareActivity, href: "/dashboard" },
  { id: "clientes", name: "Listado de Clientes", icon: Users, href: "/ClientList" },
  { id: "cuotas", name: "Detalle de Cuotas", icon: ClipboardList, href: "/LoanDetails" },
  { id: "recordatorio", name: "Envio de Recordatorios", icon: Mail, href: "/Recordatorio" },
  { id: "simulador", name: "Simulador de Préstamos", icon: Calculator, href: "/LoanSimulator" },
  { id: "analisis", name: "Análisis de Clientes", icon: UserCheck, href: "/ClientAnalysis" },
  { id: "proveedores", name: "Proveedores", icon: Building2, href: "/Providers" },
  { id: "facturacion", name: "Facturación AFIP", icon: Receipt, href: "/Billing" },
  { id: "compras", name: "Compras", icon: ShoppingCart, href: "/Purchases" },
  { id: "caja", name: "Caja", icon: DollarSign, href: "/CashRegister" },
];

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null; // Ocultar sidebar si no hay usuario autenticado

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error al cerrar sesión:", error);
      }
      router.push("/");
      router.refresh(); // Asegurar actualización de estado
    } catch (error) {
      console.error("Error inesperado al cerrar sesión:", error);
    }
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
            {sections.map(({ id, name, icon: Icon, href }) => (
              <Link key={id} href={href} onClick={() => setIsOpen(false)}>
                <div
                  className={cn(
                    "flex items-center p-2 hover:bg-accent rounded-md transition-colors",
                    pathname.startsWith(href) ? "bg-accent" : ""
                  )}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  {name}
                </div>
              </Link>
            ))}
          </nav>
          <div className="p-4">
            <Button onClick={handleLogout} variant="destructive" className="w-full">
              Cerrar Sesión
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 bg-white border-r h-screen fixed left-0 top-0 p-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h1 className="font-bold text-gray-600 text-xl">GP Capital</h1>
        </div>
        <nav className="p-2">
          {sections.map(({ id, name, icon: Icon, href }) => (
            <Link key={id} href={href}>
              <div
                className={cn(
                  "flex items-center p-2 hover:bg-accent rounded-md transition-colors mb-2",
                  pathname.startsWith(href) ? "bg-accent" : ""
                )}
              >
                <Icon className="mr-2 h-5 w-5" />
                {name}
              </div>
            </Link>
          ))}
        </nav>
        <div className="p-4">
          <Button onClick={handleLogout} variant="destructive" className="w-full">
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
