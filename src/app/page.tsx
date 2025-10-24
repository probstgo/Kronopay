import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  BarChart3,
  LogIn,
  ArrowRight,
  Zap,
  PhoneOff,
  PiggyBank,
  Frown,
  Table,
  BrainCircuit,
  MessageSquare,
  Sliders,
  Plug,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  Upload,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import HeroShowcase from "@/components/HeroShowcase";

export default function Home() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Header minimalista estilo Stripe */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="text-xl font-semibold text-gray-900 tracking-tight">Kronopay</span>
          </div>
          <Button asChild variant="ghost" className="text-gray-600 hover:text-gray-900">
            <Link href="/login" className="flex items-center gap-2">
              <LogIn className="w-4 h-4" />
              Iniciar Sesión
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-8 sm:pt-16 md:pt-24 pb-16 sm:pb-24 md:pb-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="mb-8">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200">
              <Zap className="w-4 h-4 mr-2" />
              +500 empresas ya automatizaron su cobranza
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-900 mb-6 sm:mb-8 leading-tight tracking-tight text-center mx-auto max-w-[18ch] sm:max-w-[20ch]">
            Recupera más deuda,
            <br />
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent inline-block whitespace-nowrap text-[0.85em] sm:text-[1em]">más rápido</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed">
            Automatiza tu proceso de cobranza con IA para contactar a tus clientes por WhatsApp, SMS, Email y Voz en el momento y canal correctos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 text-lg font-medium">
              <Link href="/register" className="flex items-center gap-2">
                Solicitar una Demo
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg font-medium">
              <Link href="/login">Agenda una reunión</Link>
            </Button>
          </div>

          <div className="mt-10 text-gray-500">
            <div className="text-sm mb-3">Con la confianza de</div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-gray-400">
              <span className="px-3 py-1 rounded-full border border-gray-200">Fintech X</span>
              <span className="px-3 py-1 rounded-full border border-gray-200">Banco Y</span>
              <span className="px-3 py-1 rounded-full border border-gray-200">Retail Z</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problema */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 tracking-tight">La cobranza tradicional ya no funciona</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">Procesos manuales, equipos costosos y una experiencia que tus clientes rechazan. Es hora de cambiar.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <PhoneOff className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Bajas tasas de contacto</h3>
              <p className="text-gray-600 text-sm">Tus agentes pasan el 80% del tiempo en buzones de voz o números equivocados.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <PiggyBank className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Altos costos operativos</h3>
              <p className="text-gray-600 text-sm">Call centers caros y difíciles de escalar cuando más los necesitas.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Frown className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Mala experiencia del cliente</h3>
              <p className="text-gray-600 text-sm">Llamadas insistentes que dañan la relación y reducen la probabilidad de pago.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <Table className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Procesos manuales y desconectados</h3>
              <p className="text-gray-600 text-sm">Excel, email y telefonía por separado, sin trazabilidad ni automatización.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solución */}
      <section className="py-24 bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Transforma tu cobranza con Kronopay</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              Nuestra plataforma unifica todas tus comunicaciones en un solo lugar. Con IA, diseñamos la estrategia óptima para cada deudor, automatizando hasta el 90% del proceso y mejorando la tasa de recupero.
            </p>
            <div className="flex gap-4">
              <Button size="lg" asChild className="bg-gray-900 hover:bg-gray-800 text-white">
                <Link href="/register" className="flex items-center gap-2">Solicitar una Demo <ArrowRight className="w-5 h-5" /></Link>
              </Button>
              <Button variant="outline" asChild className="border-gray-300 text-gray-700 hover:bg-gray-50">
                <Link href="/login">Ver producto</Link>
              </Button>
            </div>
          </div>
          <HeroShowcase />
        </div>
      </section>

      {/* Características principales (Omnicanal) */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Comunicación omnicanal potenciada por IA</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">Las 6 capacidades que definen Kronopay.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Flujos omnicanal</h3>
              <p className="text-gray-600">Diseña journeys que combinan WhatsApp, Email, SMS y Bots de Voz.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4">
                <BrainCircuit className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Motor de decisión (IA)</h3>
              <p className="text-gray-600">Predice el mejor canal, hora y mensaje para cada deudor.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Portal de pagos</h3>
              <p className="text-gray-600">Autogestión 24/7: ver deuda, negociar planes y pagar online.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4">
                <Sliders className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Automatización y segmentación</h3>
              <p className="text-gray-600">Reglas por antigüedad, riesgo y monto para flujos automáticos.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Dashboard y analítica</h3>
              <p className="text-gray-600">KPIs en vivo: Tasa de Recupero, Contacto y Costo por Cobro.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4">
                <Plug className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Integraciones</h3>
              <p className="text-gray-600">Conecta fácilmente con tu ERP, CRM o core bancario.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonios - Prueba social detallada */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Empresas que ya confían en Kronopay</h2>
            <p className="text-xl text-gray-600">Resultados reales en recuperación y experiencia del cliente.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-bold">JD</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Juan Díaz</h4>
                  <p className="text-gray-600 text-sm">Gerente de Cobranza, Fintech X</p>
                </div>
              </div>
              <p className="text-gray-700 italic">&ldquo;Desde que usamos Kronopay, la tasa de recuperación en cartera temprana aumentó 25% y redujimos a la mitad los costos de call center.&rdquo;</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-green-600 font-bold">MR</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">María Rodríguez</h4>
                  <p className="text-gray-600 text-sm">CFO, E-commerce Y</p>
                </div>
              </div>
              <p className="text-gray-700 italic">&ldquo;La implementación fue rápida y el portal de autogestión es un éxito. Nuestros clientes prefieren pagar online.&rdquo;</p>
            </div>
          </div>

          <div className="text-center">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6 text-gray-600">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">500+</div>
                <div className="text-sm">Empresas</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">$2M+</div>
                <div className="text-sm">Recuperado</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">95%</div>
                <div className="text-sm">Satisfacción</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios tangibles (ROI) */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-8 tracking-tight">Resultados que importan al negocio</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <TrendingUp className="w-4 h-4 text-green-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Aumenta tu Tasa de Recupero</h3>
                    <p className="text-gray-600 leading-relaxed">Clientes reportan +30% de recuperación promedio en deuda vencida.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <PiggyBank className="w-4 h-4 text-green-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Reduce tu costo operativo</h3>
                    <p className="text-gray-600 leading-relaxed">Hasta 50% menos cost-to-collect al automatizar tareas manuales.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-green-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Mejora la satisfacción del cliente</h3>
                    <p className="text-gray-600 leading-relaxed">Convierte una experiencia negativa en positiva con canales digitales y flexibilidad.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <ShieldCheck className="w-4 h-4 text-green-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Cumplimiento garantizado</h3>
                    <p className="text-gray-600 leading-relaxed">Flujos automatizados que respetan normativas locales de cobranza.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Impacto en métricas</h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">+30%</div>
                  <div className="text-gray-600 font-medium">Recupero</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">-50%</div>
                  <div className="text-gray-600 font-medium">Costo</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">+95%</div>
                  <div className="text-gray-600 font-medium">CSAT/NPS</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">100%</div>
                  <div className="text-gray-600 font-medium">Compliance</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 tracking-tight">¿Cómo funciona?</h2>
            <p className="text-lg text-gray-600">Empieza en minutos y optimiza continuamente.</p>
          </div>
          <div className="grid md:grid-cols-5 gap-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                1
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Regístrate</h3>
              <p className="text-gray-600 text-sm">Crea tu cuenta y accede a la plataforma.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                2
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Conecta</h3>
              <p className="text-gray-600 text-sm">Integra tu cartera vía API o subiendo un archivo.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                3
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto mb-4">
                <Sliders className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Configura</h3>
              <p className="text-gray-600 text-sm">Diseña estrategias omnicanal o usa plantillas.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                4
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto mb-4">
                <PlayCircle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Recupera</h3>
              <p className="text-gray-600 text-sm">Activa campañas y mira cómo llegan los pagos.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                5
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Analiza</h3>
              <p className="text-gray-600 text-sm">Optimiza midiendo qué canales y mensajes funcionan mejor.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final - Estilo Stripe con gradiente */}
      <section className="py-32 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold mb-8 tracking-tight">Transforma tu proceso de cobranza hoy</h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">Agenda una demo personalizada y descubre por qué las empresas líderes están cambiando a Kronopay.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 text-lg font-medium">
              <Link href="/register" className="flex items-center gap-2">
                Solicitar mi Demo
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200 px-8 py-4 text-lg font-medium">
              <Link href="/login">Ya tengo cuenta</Link>
            </Button>
          </div>
          <p className="text-sm text-gray-400 mt-6">
            ✅ Configuración en 5 minutos • ✅ Sin compromiso • ✅ Resultados en 24 horas
          </p>
        </div>
      </section>

      {/* Footer minimalista */}
      <footer className="border-t border-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">K</span>
                </div>
                <span className="text-xl font-semibold text-gray-900">Kronopay</span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                La infraestructura de cobranza más avanzada con inteligencia artificial
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Producto</h4>
              <ul className="space-y-3 text-gray-600">
                <li>Características</li>
                <li>Precios</li>
                <li>Integraciones</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Soporte</h4>
              <ul className="space-y-3 text-gray-600">
                <li>Centro de Ayuda</li>
                <li>Contacto</li>
                <li>Documentación</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-3 text-gray-600">
                <li>Privacidad</li>
                <li>Términos</li>
                <li>Cookies</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-16 pt-8 text-center text-gray-500">
            <p>&copy; 2024 Kronopay. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
