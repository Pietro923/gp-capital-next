"use client";

import Sidebar from "@/components/sidebar";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Evitar redirección si estamos en la página de login
  useEffect(() => {
    if (!loading && !user && pathname !== "/") {
      router.push("/");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return <p className="text-center mt-10">Cargando sesión...</p>;
  }

  if (!user && pathname !== "/") {
    return null;
  }

  // Si estamos en login, solo mostramos el contenido sin sidebar
  if (pathname === "/") {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar fijo a la izquierda */}
      <div className="fixed inset-y-0 left-0 w-64">
        <Sidebar />
      </div>

      {/* Contenido principal con margen izquierdo para evitar superposición */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <ProtectedLayout>
            {children}
            <Toaster />
          </ProtectedLayout>
        </body>
      </html>
    </AuthProvider>
  );
}
