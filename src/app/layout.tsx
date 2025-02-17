"use client";
import Sidebar from "@/components/sidebar";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Effect to handle sidebar collapse state on smaller screens
  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };
    
    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auth protection effect
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
      {/* Sidebar component will handle its own responsive behavior */}
      <Sidebar />
      
      {/* Contenido principal con padding adaptativo */}
      <main className={cn(
        "flex-1 p-4 md:p-6 lg:p-8 transition-all duration-300",
        "pt-16 lg:pt-8", /* Extra padding-top for mobile due to the fixed menu button */
        { "lg:ml-20": sidebarCollapsed }, /* When sidebar is collapsed */
        { "lg:ml-64": !sidebarCollapsed }  /* When sidebar is expanded */
      )}>
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