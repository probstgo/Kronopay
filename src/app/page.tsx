import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Phone, Mail, Users, BarChart3, Shield, Clock, LogIn } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header con botón de Login */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-xl font-bold text-gray-900">CobranzaIA</span>
          </div>
          <Button asChild variant="outline">
            <Link href="/login" className="flex items-center gap-2">
              <LogIn className="w-4 h-4" />
              Iniciar Sesión
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-4">
            🚀 Sistema de Cobranza Inteligente
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Automatiza tu
            <span className="text-blue-600"> cobranza</span>
            <br />
            con IA
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Reduce el tiempo de cobranza en un 70% con llamadas automáticas, 
            emails personalizados y seguimiento inteligente de deudores.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/register">Comenzar Gratis</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">
          Todo lo que necesitas para cobrar más
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center p-6">
            <Phone className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <CardTitle>Llamadas Automáticas</CardTitle>
            <CardDescription>
              IA que llama a tus deudores con voz natural y conversaciones inteligentes
            </CardDescription>
          </Card>
          
          <Card className="text-center p-6">
            <Mail className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <CardTitle>Emails Personalizados</CardTitle>
            <CardDescription>
              Plantillas automáticas que se adaptan a cada deudor y situación
            </CardDescription>
          </Card>
          
          <Card className="text-center p-6">
            <BarChart3 className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <CardTitle>Analytics Avanzado</CardTitle>
            <CardDescription>
              Reportes detallados de efectividad y métricas de cobranza
            </CardDescription>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                ¿Por qué elegir nuestro sistema?
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span>Reduce el tiempo de cobranza en un 70%</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span>Aumenta la tasa de recuperación en un 45%</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span>Automatiza el 90% del proceso</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span>Integra con tu sistema actual</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-100 p-8 rounded-lg">
              <h3 className="text-2xl font-bold mb-4">Resultados Reales</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">70%</div>
                  <div className="text-sm text-gray-600">Menos tiempo</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">45%</div>
                  <div className="text-sm text-gray-600">Más cobros</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">90%</div>
                  <div className="text-sm text-gray-600">Automatizado</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">24/7</div>
                  <div className="text-sm text-gray-600">Disponible</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            ¿Listo para revolucionar tu cobranza?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Únete a cientos de empresas que ya automatizaron su proceso de cobranza
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/register">Comenzar Ahora - Es Gratis</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">CobranzaIA</h3>
              <p className="text-gray-400">
                El sistema de cobranza más avanzado con inteligencia artificial
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Características</li>
                <li>Precios</li>
                <li>Integraciones</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Centro de Ayuda</li>
                <li>Contacto</li>
                <li>Documentación</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Privacidad</li>
                <li>Términos</li>
                <li>Cookies</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 CobranzaIA. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
