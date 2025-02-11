"use client";
import Sidebar from "@/components/sidebar";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
        </body>
      </html>
    </AuthProvider>
  );
}