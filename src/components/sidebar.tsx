import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase/client";
import {
  Sheet,
  SheetContent,
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
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { LucideIcon } from 'lucide-react';

// Definimos las interfaces para nuestros tipos
interface NavItem {
  id: string;
  name: string;
  icon: LucideIcon;
  href: string;
}

interface Section {
  id: string;
  title: string;
  items: NavItem[];
}

interface NavLinkProps {
  item: NavItem;
  collapsed: boolean;
}

const sections: Section[] = [
  { 
    id: "main",
    title: "Principal",
    items: [
      { id: "dashboard", name: "Dashboard", icon: SquareActivity, href: "/dashboard" },
      { id: "clientes", name: "Listado de Clientes", icon: Users, href: "/ClientList" },
      { id: "cuotas", name: "Detalle de Cuotas", icon: ClipboardList, href: "/LoanDetails" },
    ]
  },
  {
    id: "operations",
    title: "Operaciones",
    items: [
      { id: "recordatorio", name: "Recordatorios", icon: Mail, href: "/Recordatorio" },
      { id: "simulador", name: "Simulador", icon: Calculator, href: "/LoanSimulator" },
      { id: "analisis", name: "Análisis de Clientes", icon: UserCheck, href: "/ClientAnalysis" },
    ]
  },
  {
    id: "finance",
    title: "Finanzas",
    items: [
      { id: "proveedores", name: "Proveedores", icon: Building2, href: "/Providers" },
      { id: "facturacion", name: "Facturación", icon: Receipt, href: "/Billing" },
      { id: "compras", name: "Compras", icon: ShoppingCart, href: "/Purchases" },
      { id: "caja", name: "Caja", icon: DollarSign, href: "/CashRegister" },
    ]
  },
];

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  if (!user) return null;

  const NavLink: React.FC<NavLinkProps> = ({ item, collapsed }) => (
    <Link href={item.href}>
      <div
        className={cn(
          "group flex items-center p-2 rounded-lg transition-all duration-150",
          "hover:bg-blue-50 dark:hover:bg-blue-950",
          pathname === item.href ? "bg-blue-100 dark:bg-blue-900" : "",
          collapsed ? "justify-center" : ""
        )}
      >
        <item.icon 
          className={cn(
            "w-5 h-5 transition-colors",
            pathname === item.href ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400",
            "group-hover:text-blue-600 dark:group-hover:text-blue-400"
          )}
        />
        {!collapsed && (
          <span className={cn(
            "ml-3 text-sm font-medium transition-colors",
            pathname === item.href ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300",
            "group-hover:text-blue-600 dark:group-hover:text-blue-400"
          )}>
            {item.name}
          </span>
        )}
      </div>
    </Link>
  );

  const SidebarContent = ({ collapsed = false }) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold">GP</span>
            </div>
            <h1 className="font-bold text-gray-800 dark:text-white text-lg">Capital</h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="p-2"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <ChevronLeft className={cn(
            "h-5 w-5 transition-transform",
            isCollapsed ? "rotate-180" : ""
          )} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3">
        {sections.map((section) => (
          <div key={section.id} className="mb-6">
            {!collapsed && (
              <h2 className="mb-2 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {section.title}
              </h2>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink key={item.id} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className={cn(
            "w-full justify-center hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400",
            "text-gray-700 dark:text-gray-300"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="ml-2">Cerrar Sesión</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Trigger */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden fixed top-4 left-4 z-40">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:block fixed left-0 top-0 h-screen border-r border-gray-200 dark:border-gray-800",
        "bg-white dark:bg-gray-950 transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <SidebarContent collapsed={isCollapsed} />
      </div>
    </>
  );
};

export default Sidebar;