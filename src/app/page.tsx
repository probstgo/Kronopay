import { Button } from "@/components/ui/button";
import { CheckCircle, Phone, Mail, BarChart3, LogIn, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

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

      {/* Hero Section - Estilo Stripe con mucho whitespace */}
      <section className="pt-24 pb-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="mb-8">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200">
              <Zap className="w-4 h-4 mr-2" />
              +500 empresas ya automatizaron su cobranza
            </span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight tracking-tight">
            Recupera tu dinero
            <br />
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              automáticamente
            </span>
            <br />
            sin esfuerzo
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            IA que llama, envía emails y negocia con tus deudores 24/7. 
            Recupera hasta 3x más dinero en la mitad de tiempo.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 text-lg font-medium">
              <Link href="/register" className="flex items-center gap-2">
                Comenzar ahora
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg font-medium">
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Sección con gradiente de fondo - Estilo Stripe */}
      <section className="py-32 bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Deja que la IA haga el trabajo pesado
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Mientras tú te enfocas en tu negocio, nuestra IA recupera tu dinero de forma inteligente y persistente
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform duration-300">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Llamadas que Nunca se Rinden</h3>
              <p className="text-gray-600 leading-relaxed">
                Nuestra IA llama hasta 10 veces por deudor, adaptando su estrategia según la respuesta. 
                <strong>Resultado: 85% más cobros que las llamadas manuales.</strong>
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform duration-300">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Emails que Convierten</h3>
              <p className="text-gray-600 leading-relaxed">
                Cada email se personaliza según el historial del deudor. 
                <strong>Desde recordatorios amables hasta notificaciones legales.</strong>
              </p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform duration-300">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Resultados en Tiempo Real</h3>
              <p className="text-gray-600 leading-relaxed">
                Ve exactamente cuánto dinero recuperaste hoy, qué estrategias funcionan mejor y cuáles deudores están respondiendo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección de prueba social */}
      <section className="py-32 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Empresas que ya recuperaron su dinero
            </h2>
            <p className="text-xl text-gray-600">
              Más de 500 empresas confían en Kronopay para automatizar su cobranza
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-bold">JD</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Juan Díaz</h4>
                  <p className="text-gray-600 text-sm">CEO, Clínica Dental Smile</p>
                </div>
              </div>
              <p className="text-gray-700 italic">&ldquo;Recuperamos $15,000 en la primera semana. La IA es más efectiva que nuestro personal llamando manualmente.&rdquo;</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-green-600 font-bold">MR</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">María Rodríguez</h4>
                  <p className="text-gray-600 text-sm">Directora, Gimnasio FitLife</p>
                </div>
              </div>
              <p className="text-gray-700 italic">&ldquo;Eliminamos el estrés de cobrar. Nuestros miembros ya no se van por llamadas agresivas. La IA es empática.&rdquo;</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-purple-600 font-bold">CL</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Carlos López</h4>
                  <p className="text-gray-600 text-sm">Fundador, Consultora ABC</p>
                </div>
              </div>
              <p className="text-gray-700 italic">&ldquo;$50,000 recuperados en 2 semanas. El ROI fue inmediato. Ahora no puedo imaginar cobrar sin IA.&rdquo;</p>
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

      {/* Sección de beneficios - Layout asimétrico estilo Stripe */}
      <section className="py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-5xl font-bold text-gray-900 mb-8 tracking-tight">
                Casos reales de empresas como la tuya
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">&ldquo;Recuperamos $50,000 en 2 semanas&rdquo;</h3>
                    <p className="text-gray-600 leading-relaxed">Empresa de servicios que tenía $200K en cuentas por cobrar. Nuestra IA recuperó el 25% en solo 2 semanas, sin que ellos hicieran nada.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">&ldquo;Eliminamos el estrés de cobrar&rdquo;</h3>
                    <p className="text-gray-600 leading-relaxed">Clínica dental que gastaba 20 horas semanales llamando pacientes. Ahora la IA hace todo y ellos se enfocan en atender.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">&ldquo;Nunca más perdemos clientes por cobrar&rdquo;</h3>
                    <p className="text-gray-600 leading-relaxed">Gimnasio que perdía miembros por cobros agresivos. Ahora la IA es empática y mantiene la relación mientras cobra.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Resultados Reales</h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">70%</div>
                  <div className="text-gray-600 font-medium">Menos tiempo</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">45%</div>
                  <div className="text-gray-600 font-medium">Más cobros</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">90%</div>
                  <div className="text-gray-600 font-medium">Automatizado</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">24/7</div>
                  <div className="text-gray-600 font-medium">Disponible</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final - Estilo Stripe con gradiente */}
      <section className="py-32 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold mb-8 tracking-tight">
            ¿Cuánto dinero estás perdiendo cada día?
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Cada día que esperas, tus deudores se olvidan de la deuda. 
            <strong>Empieza a recuperar tu dinero en los próximos 5 minutos.</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 text-lg font-medium">
              <Link href="/register" className="flex items-center gap-2">
                Recuperar mi dinero ahora
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
