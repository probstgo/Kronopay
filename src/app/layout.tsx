import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kronopay - La Infraestructura de Cobranza para Internet",
  description: "Sistema inteligente de cobranza con llamadas automáticas, emails personalizados y seguimiento avanzado. Reduce el tiempo de cobranza en un 70%.",
  keywords: ["cobranza", "automatización", "inteligencia artificial", "llamadas automáticas", "emails", "gestión de deudores", "Kronopay"],
  authors: [{ name: "Kronopay" }],
  openGraph: {
    title: "Kronopay - La Infraestructura de Cobranza para Internet",
    description: "Sistema inteligente de cobranza con llamadas automáticas, emails personalizados y seguimiento avanzado.",
    type: "website",
    locale: "es_ES",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
