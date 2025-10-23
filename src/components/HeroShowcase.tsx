'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { 
  BrainCircuit, 
  Sliders, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  CheckCircle2,
  Zap,
  BarChart4
} from "lucide-react";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  return reduced;
}

function useCountUp(target: number, duration: number = 1500, delay: number = 0) {
  const [value, setValue] = useState(0);
  const reduced = usePrefersReducedMotion();
  
  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    
    let timeout: NodeJS.Timeout;
    let raf: number;
    let startTime: number;
    
    const startAnimation = () => {
      startTime = performance.now();
      tick();
    };
    
    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(eased * target));
      
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    
    timeout = setTimeout(startAnimation, delay);
    
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay, reduced]);
  
  return value;
}

function generateSeries(points: number, start: number, trend: 'up' | 'down', volatility: number = 1) {
  const values: number[] = [];
  let last = start;
  for (let i = 0; i < points; i++) {
    const noise = (Math.random() - 0.5) * 6 * volatility;
    const drift = trend === 'up' ? 2.2 : -2.2;
    last = Math.max(5, Math.min(100, last + drift + noise));
    values.push(last);
  }
  return values;
}

function pathFromSeries(values: number[], width: number, height: number) {
  if (values.length === 0) return "";
  const max = 100;
  const min = 0;
  const stepX = width / (values.length - 1);
  const y = (v: number) => height - ((v - min) / (max - min)) * height;
  let d = `M 0 ${y(values[0]).toFixed(2)}`;
  for (let i = 1; i < values.length; i++) {
    const x = stepX * i;
    d += ` L ${x.toFixed(2)} ${y(values[i]).toFixed(2)}`;
  }
  return d;
}

export default function HeroShowcase() {
  const reduced = usePrefersReducedMotion();
  const [activeTab, setActiveTab] = useState<'kronopay' | 'tradicional'>('kronopay');
  
  // Datos para Kronopay
  const kpPaymentsSeries = useMemo(() => generateSeries(32, 35, 'up', 0.8), []);
  const kpCostsSeries = useMemo(() => generateSeries(32, 70, 'down', 0.8), []);
  
  // Datos para cobranza tradicional
  const tradPaymentsSeries = useMemo(() => generateSeries(32, 35, 'up', 0.3), []);
  const tradCostsSeries = useMemo(() => generateSeries(32, 70, 'down', 0.3), []);
  
  // Referencias para animaciones
  const kpPaymentsRef = useRef<SVGPathElement | null>(null);
  const kpCostsRef = useRef<SVGPathElement | null>(null);
  const tradPaymentsRef = useRef<SVGPathElement | null>(null);
  const tradCostsRef = useRef<SVGPathElement | null>(null);
  
  // Stats
  const recoveryRate = useCountUp(activeTab === 'kronopay' ? 32 : 12, 1500, 200);
  const contactRate = useCountUp(activeTab === 'kronopay' ? 78 : 45, 1500, 400);
  const costReduction = useCountUp(activeTab === 'kronopay' ? 50 : 10, 1500, 600);
  
  // Animar trazos
  useEffect(() => {
    if (reduced) return;
    
    const animate = (el: SVGPathElement | null, delay: number = 0) => {
      if (!el) return;
      const len = el.getTotalLength();
      el.style.strokeDasharray = `${len}`;
      el.style.strokeDashoffset = `${len}`;
      
      setTimeout(() => {
        el.style.transition = 'stroke-dashoffset 1500ms ease-out';
        el.style.strokeDashoffset = '0';
      }, delay);
    };
    
    if (activeTab === 'kronopay') {
      animate(kpPaymentsRef.current, 100);
      animate(kpCostsRef.current, 300);
    } else {
      animate(tradPaymentsRef.current, 100);
      animate(tradCostsRef.current, 300);
    }
  }, [activeTab, reduced]);
  
  // Calcular puntos finales para los círculos
  const getLastPoint = (series: number[], height: number) => {
    const lastValue = series[series.length - 1] ?? 0;
    return height - (lastValue / 100) * height;
  };
  
  return (
    <div className="rounded-3xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      {/* Header con tabs */}
      <div className="border-b border-gray-100 overflow-x-auto">
        <div className="flex min-w-max">
          <TabButton 
            active={activeTab === 'kronopay'} 
            onClick={() => setActiveTab('kronopay')}
            label="Con Kronopay"
            icon={<Zap className="w-4 h-4" />}
            emoji="🤑"
          />
          <TabButton 
            active={activeTab === 'tradicional'} 
            onClick={() => setActiveTab('tradicional')}
            label="Cobranza tradicional"
            icon={<BarChart4 className="w-4 h-4" />}
            emoji="😞💸"
          />
        </div>
      </div>
      
      {/* Contenido principal */}
      <div className="p-4 sm:p-6 md:p-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard 
            label="Tasa de Recupero" 
            value={`+${recoveryRate}%`} 
            icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />} 
            trend="up"
            color={activeTab === 'kronopay' ? 'indigo' : 'gray'}
          />
          <StatCard 
            label="Tasa de Contacto" 
            value={`${contactRate}%`} 
            icon={<CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />} 
            trend="up"
            color={activeTab === 'kronopay' ? 'indigo' : 'gray'}
          />
          <StatCard 
            label="Reducción de Costos" 
            value={`-${costReduction}%`} 
            icon={<TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />} 
            trend="down"
            color={activeTab === 'kronopay' ? 'indigo' : 'gray'}
          />
        </div>
        
        {/* Gráfico */}
        <div className="relative h-[220px] sm:h-[260px] w-full overflow-hidden">
          <svg viewBox="0 0 640 280" className="h-full w-full">
            <defs>
              <linearGradient id="kp-payments-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
              <linearGradient id="kp-costs-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#fb7185" />
              </linearGradient>
              <linearGradient id="trad-payments-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6b7280" />
                <stop offset="100%" stopColor="#9ca3af" />
              </linearGradient>
              <linearGradient id="trad-costs-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6b7280" />
                <stop offset="100%" stopColor="#9ca3af" />
              </linearGradient>
              <linearGradient id="kp-payments-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="kp-costs-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="trad-payments-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6b7280" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#6b7280" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="trad-costs-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6b7280" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#6b7280" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g transform="translate(16,24)">
              <rect x="0" y="0" width="608" height="232" rx="12" className="fill-gray-50" />
              
              {/* Grid lines */}
              {Array.from({ length: 4 }).map((_, i) => (
                <line 
                  key={i} 
                  x1="0" 
                  x2="608" 
                  y1={46 * (i + 1)} 
                  y2={46 * (i + 1)} 
                  className="stroke-gray-200" 
                  strokeDasharray="4 4" 
                />
              ))}
              
              {/* Kronopay data */}
              {activeTab === 'kronopay' && (
                <>
                  <path 
                    d={`${pathFromSeries(kpPaymentsSeries, 608, 232)} L 608 232 L 0 232 Z`} 
                    fill="url(#kp-payments-fill)" 
                    opacity={activeTab === 'kronopay' ? "1" : "0.3"}
                  />
                  <path 
                    d={`${pathFromSeries(kpCostsSeries, 608, 232)} L 608 232 L 0 232 Z`} 
                    fill="url(#kp-costs-fill)" 
                    opacity={activeTab === 'kronopay' ? "1" : "0.3"}
                  />
                  <path 
                    ref={kpPaymentsRef} 
                    d={pathFromSeries(kpPaymentsSeries, 608, 232)} 
                    fill="none" 
                    stroke="url(#kp-payments-line)" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                  />
                  <path 
                    ref={kpCostsRef} 
                    d={pathFromSeries(kpCostsSeries, 608, 232)} 
                    fill="none" 
                    stroke="url(#kp-costs-line)" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                  />
                  <circle 
                    cx={608} 
                    cy={getLastPoint(kpPaymentsSeries, 232)} 
                    r="6" 
                    className="fill-white" 
                    stroke="#4f46e5" 
                    strokeWidth="3" 
                  />
                  <circle 
                    cx={608} 
                    cy={getLastPoint(kpCostsSeries, 232)} 
                    r="6" 
                    className="fill-white" 
                    stroke="#f43f5e" 
                    strokeWidth="3" 
                  />
                </>
              )}
              
              {/* Traditional data */}
              {activeTab === 'tradicional' && (
                <>
                  <path 
                    d={`${pathFromSeries(tradPaymentsSeries, 608, 232)} L 608 232 L 0 232 Z`} 
                    fill="url(#trad-payments-fill)" 
                  />
                  <path 
                    d={`${pathFromSeries(tradCostsSeries, 608, 232)} L 608 232 L 0 232 Z`} 
                    fill="url(#trad-costs-fill)" 
                  />
                  <path 
                    ref={tradPaymentsRef} 
                    d={pathFromSeries(tradPaymentsSeries, 608, 232)} 
                    fill="none" 
                    stroke="url(#trad-payments-line)" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                  />
                  <path 
                    ref={tradCostsRef} 
                    d={pathFromSeries(tradCostsSeries, 608, 232)} 
                    fill="none" 
                    stroke="url(#trad-costs-line)" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                  />
                  <circle 
                    cx={608} 
                    cy={getLastPoint(tradPaymentsSeries, 232)} 
                    r="6" 
                    className="fill-white" 
                    stroke="#6b7280" 
                    strokeWidth="3" 
                  />
                  <circle 
                    cx={608} 
                    cy={getLastPoint(tradCostsSeries, 232)} 
                    r="6" 
                    className="fill-white" 
                    stroke="#6b7280" 
                    strokeWidth="3" 
                  />
                </>
              )}
            </g>
          </svg>
          
          {/* Leyenda */}
          <div className="pointer-events-none absolute left-1/2 transform -translate-x-1/2 top-3 flex items-center gap-3 sm:gap-5 rounded-full bg-white/90 px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 shadow-sm backdrop-blur-sm border border-gray-100">
            <LegendBadge 
              color={activeTab === 'kronopay' ? "bg-gradient-to-r from-indigo-600 to-indigo-400" : "bg-gradient-to-r from-gray-500 to-gray-400"} 
              label="Pagos (↑)" 
            />
            <LegendBadge 
              color={activeTab === 'kronopay' ? "bg-gradient-to-r from-rose-600 to-rose-400" : "bg-gradient-to-r from-gray-500 to-gray-400"} 
              label="Costo (↓)" 
            />
          </div>
        </div>
        
        {/* Feature highlight */}
        <div className="mt-6 sm:mt-8">
          <div className={`transition-opacity duration-300 ${activeTab === 'kronopay' ? 'opacity-100' : 'opacity-50'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              <FeatureItem 
                icon={<BrainCircuit className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />} 
                label="IA decide canal y momento" 
                iconBg="bg-indigo-600"
                active={activeTab === 'kronopay'}
              />
              <FeatureItem 
                icon={<Sliders className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />} 
                label="Automatización 90% del flujo" 
                iconBg="bg-indigo-600"
                active={activeTab === 'kronopay'}
              />
              <FeatureItem 
                icon={<MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />} 
                label="Omnicanalidad: WhatsApp • Email • SMS • Voz" 
                iconBg="bg-indigo-600"
                active={activeTab === 'kronopay'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, icon, emoji }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode; emoji: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
        active 
          ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
      <span className="text-base">{emoji}</span>
    </button>
  );
}

function StatCard({ label, value, icon, trend, color = 'indigo' }: { label: string; value: string; icon: React.ReactNode; trend: 'up' | 'down'; color: 'indigo' | 'gray' }) {
  const colorClasses = {
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      icon: 'text-indigo-500',
      trendUp: 'text-emerald-600 bg-emerald-50',
      trendDown: 'text-rose-600 bg-rose-50',
    },
    gray: {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      icon: 'text-gray-500',
      trendUp: 'text-gray-600 bg-gray-100',
      trendDown: 'text-gray-600 bg-gray-100',
    }
  };
  
  const colors = colorClasses[color];
  
  return (
    <div className={`rounded-xl ${colors.bg} p-4 sm:p-5 transition-all duration-300 min-w-0`}>
      <div className="flex justify-between items-start mb-2 sm:mb-3 gap-2">
        <span className="text-xs sm:text-sm font-medium text-gray-600 line-clamp-2 min-w-0">{label}</span>
        <span className={`rounded-full p-1 sm:p-1.5 ${colors.icon} flex-shrink-0`}>
          {icon}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <div className={`text-2xl sm:text-3xl font-bold ${colors.text} leading-none`}>{value}</div>
        <div className={`text-[10px] sm:text-xs font-medium px-2 py-1 rounded-full inline-flex items-center justify-center w-fit ${
          trend === 'up' ? colors.trendUp : colors.trendDown
        }`}>
          {trend === 'up' ? 'Mejorando' : 'Reduciendo'}
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, label, iconBg, active = true }: { icon: React.ReactNode; label: string; iconBg: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-2 sm:gap-3 rounded-full ${active ? 'bg-indigo-50' : 'bg-gray-50'} px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm ${active ? 'text-indigo-700' : 'text-gray-500'} transition-colors duration-300 min-w-0`}>
      <span className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full ${active ? iconBg : 'bg-gray-400'} shadow-sm transition-colors duration-300`}>
        {icon}
      </span>
      <span className="font-medium min-w-0 overflow-hidden text-ellipsis">{label}</span>
    </div>
  );
}

function LegendBadge({ color, label }: { color: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 sm:gap-2.5">
      <span className={`h-2.5 w-4 sm:h-3 sm:w-6 rounded-full ${color}`} />
      <span className="font-medium whitespace-nowrap">{label}</span>
    </div>
  );
}