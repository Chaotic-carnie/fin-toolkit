"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { CORE_FEATURES } from "@/lib/constants";
import { Zap, Activity, Layers, BarChart2, MousePointerClick, ArrowUpRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const MonteCarloVisual = () => (
  <svg viewBox="0 0 400 300" className="w-full h-full opacity-80" preserveAspectRatio="none">
    <line x1="0" y1="150" x2="400" y2="150" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
    {Array.from({length: 15}).map((_, i) => {
      const isRed = i % 4 === 0;
      const stroke = isRed ? "#ef4444" : (i % 3 === 0 ? "#60a5fa" : "#3b82f6");
      const endY = 150 + (Math.random() * 200 - 100) + (isRed ? 80 : -50);
      return (
        <motion.path 
          key={i} 
          d={`M 0 150 Q 100 ${150 + (Math.random()*100-50)}, 200 ${150 + (Math.random()*150-75)} T 400 ${endY}`} 
          fill="none" stroke={stroke} strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.2 + Math.random() * 0.4 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: i * 0.05 }}
        />
      )
    })}
  </svg>
);

const RiskMatrixVisual = () => (
  <div className="grid grid-cols-8 grid-rows-5 gap-1.5 w-full h-full p-4 lg:p-8 opacity-90">
    {Array.from({length: 40}).map((_, i) => {
      const isRed = i % 5 === 0 || i % 11 === 0;
      const isGreen = !isRed && (i % 2 === 0 || i % 3 === 0);
      const color = isRed ? "bg-red-500" : isGreen ? "bg-emerald-500" : "bg-slate-700";
      return (
        <motion.div 
          key={i} className={`rounded-[2px] ${color}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.2 + Math.random() * 0.6 }}
          transition={{ duration: 0.3, delay: i * 0.015 }}
        />
      )
    })}
  </div>
);

const PayoffVisual = () => (
  <svg viewBox="0 0 400 300" className="w-full h-full p-6" preserveAspectRatio="none">
    <line x1="0" y1="150" x2="400" y2="150" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
    <motion.path 
      d="M 0 190 Q 150 140, 200 60 Q 250 140, 400 190" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 5" 
      initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.5, ease: "easeInOut" }}
    />
    <motion.path 
      d="M 0 220 L 80 220 L 150 80 L 250 80 L 320 220 L 400 220" fill="none" stroke="#3b82f6" strokeWidth="4"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
    />
    <motion.circle cx="200" cy="150" r="5" fill="#ef4444" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 1.2 }} />
  </svg>
);

const SHOWCASES = [
  {
    id: "monte-carlo",
    icon: <Activity className="w-4 h-4" />,
    title: "Monte Carlo Engine",
    desc: "Simulate thousands of equity paths instantly to determine risk of ruin and optimal Kelly criterion sizing.",
    visual: <MonteCarloVisual />,
    href: "/capital/allocation"
  },
  {
    id: "Spot × Vol Heatmap",
    icon: <Layers className="w-4 h-4" />,
    title: "Spot × Vol Heatmap",
    desc: "Apply targeted market shock regimes and stress-test your structures across dynamic Spot vs. Volatility matrices.",
    visual: <RiskMatrixVisual />,
    href: "/strategy" // Moved to Scenario Engine
  },
  {
    id: "portfolio-payoff",
    icon: <BarChart2 className="w-4 h-4" />,
    title: "Portfolio T+0 Curves",
    desc: "Construct complex multi-leg portfolios and interactively visualize T+0 versus Expiration payoff curves.",
    visual: <PayoffVisual />,
    href: "/portfolio" // Moved to Portfolio Workbench
  }
];

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeShowcase, setActiveShowcase] = useState(SHOWCASES[0].id);
  const marqueeControls = useAnimationControls();

  useEffect(() => {
    setMounted(true);
    marqueeControls.start({
      x: ["0%", "-50%"], 
      transition: { ease: "linear", duration: 40, repeat: Infinity }
    });
  }, [marqueeControls]);

  if (!mounted) return null;

  const activeData = SHOWCASES.find(s => s.id === activeShowcase)!;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="h-screen w-full bg-[#020617] text-white overflow-hidden font-sans relative">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1d4ed815_0%,_transparent_60%)] pointer-events-none z-0" />
      
      <div className="h-full w-full overflow-y-auto dark-scrollbar pt-16 pb-24 relative z-10">
        <main className="flex flex-col gap-10 lg:gap-14 w-full min-h-max">
          
          <section className="w-full max-w-7xl mx-auto px-4 lg:px-6 pt-6 lg:pt-1 shrink-0">
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-4 lg:space-y-5">
              <motion.div variants={itemVariants} className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-[0_0_25px_rgba(59,130,246,0.3)]">
                <Zap className="w-6 h-6 text-blue-500" />
              </motion.div>
              <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl lg:text-[5rem] font-black uppercase tracking-tighter leading-[0.9]">
                Peeyush <span className="text-blue-600">Labs</span>
              </motion.h1>
              <motion.p variants={itemVariants} className="text-xs md:text-sm lg:text-base text-slate-400 font-medium max-w-xl">
                Advanced quantitative environment for option strategy discovery, portfolio stress-testing, and dynamic risk management.
              </motion.p>
            </motion.div>
          </section>

          <section className="w-full max-w-6xl mx-auto px-4 lg:px-6 relative z-20 shrink-0">
             <div className="flex flex-wrap justify-center gap-3 lg:gap-4">
                {CORE_FEATURES.map((feature, idx) => (
                  <motion.div key={feature.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + (idx * 0.05), duration: 0.4 }} className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)] min-w-[200px]">
                    <Link href={feature.href} className="group relative bg-white/5 backdrop-blur-md border border-white/10 p-4 lg:p-5 rounded-2xl hover:bg-white/10 hover:border-blue-500/50 transition-all flex flex-col h-full shadow-xl overflow-hidden cursor-pointer min-h-[130px] lg:min-h-[150px]">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-500/20 transition-colors" />
                      <div className="relative z-10 flex flex-col h-full space-y-2">
                        <span className="text-blue-500 font-mono text-[8px] lg:text-[9px] uppercase tracking-widest">Mod 0{idx + 1}</span>
                        <h3 className="font-black uppercase text-xs lg:text-sm tracking-tight text-white group-hover:text-blue-400 transition-colors">{feature.title}</h3>
                        <p className="text-[9px] lg:text-[10px] text-slate-400 line-clamp-2 mt-auto">{feature.desc}</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
             </div>
          </section>

          <section className="w-full max-w-6xl mx-auto px-4 lg:px-6 relative shrink-0 mb-10">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }} className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-2 lg:p-3 flex flex-col lg:flex-row shadow-2xl">
              
              <div className="w-full lg:w-[35%] flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible dark-scrollbar p-2 lg:p-4 shrink-0">
                {SHOWCASES.map((showcase) => {
                  const isActive = activeShowcase === showcase.id;
                  return (
                    <button
                      key={showcase.id}
                      onClick={() => setActiveShowcase(showcase.id)}
                      onMouseEnter={() => setActiveShowcase(showcase.id)}
                      className={`text-left p-4 lg:p-5 rounded-xl transition-all duration-300 shrink-0 min-w-[200px] lg:min-w-0 border ${isActive ? 'bg-blue-500/10 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                    >
                      <div className={`flex items-center gap-3 mb-2 font-bold uppercase tracking-widest text-[10px] lg:text-xs transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>
                        {showcase.icon} {showcase.title}
                      </div>
                      <p className={`text-[9px] lg:text-[11px] leading-relaxed transition-colors hidden lg:block ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                        {showcase.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* FIXED: Single Click Action with updated text */}
              <div 
                onClick={() => router.push(`${activeData.href}?demo=true`)}
                className="w-full lg:w-[65%] h-[250px] lg:h-[500px] bg-[#0B1121] rounded-2xl border border-white/5 relative overflow-hidden flex flex-col group cursor-pointer"
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#3b82f615_0%,_transparent_70%)] pointer-events-none" />
                
                <div className="flex-1 relative w-full h-full">
                  <AnimatePresence mode="wait">
                    <motion.div key={activeShowcase} initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 1.05, filter: "blur(4px)" }} transition={{ duration: 0.4 }} className="absolute inset-0 flex items-center justify-center p-4 lg:p-8">
                      {activeData.visual}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm z-20">
                  <div className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs flex items-center gap-3 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                    <MousePointerClick className="w-5 h-5 animate-pulse" /> Tap to launch guided demo
                  </div>
                </div>

                <div className="lg:hidden p-4 border-t border-white/5 bg-[#020617]/80 backdrop-blur-md flex justify-between items-center">
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tap visual to demo</p>
                   <ArrowUpRight className="w-4 h-4 text-blue-500" />
                </div>
              </div>

            </motion.div>
          </section>

          <div className="h-10 shrink-0" />
        </main>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.6 }} className="fixed bottom-4 left-4 z-50 pointer-events-auto">
        <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 p-3 lg:p-4 rounded-xl shadow-2xl flex flex-col gap-1 pr-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <p className="text-[9px] lg:text-[10px] uppercase tracking-widest font-bold text-slate-500 pl-2">Conceptualized by <span className="text-white">Peeyush</span></p>
          <p className="text-[9px] lg:text-[10px] uppercase tracking-widest font-bold text-slate-500 pl-2"> Built by <span className="text-blue-500">Peeyush, Naman & Parth</span></p>
        </div>
      </motion.div>
    </div>
  );
}