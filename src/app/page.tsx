"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { useGSAP } from "@gsap/react";
import { CORE_FEATURES } from "~/lib/constants";
import { ArrowUpRight, ChevronUp } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(Observer);
}

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const isAnimating = useRef(false);
  const currentIndex = useRef(0);
  const [activePage, setActivePage] = useState(0);
  const [mounted, setMounted] = useState(false);
  
  const NAV_HEIGHT = "64px"; 

  useEffect(() => {
    setMounted(true);
    const style = document.createElement("style");
    style.innerHTML = `
      ::-webkit-scrollbar { display: none; }
      * { -ms-overflow-style: none; scrollbar-width: none; }
      body, html { overflow: hidden; height: 100%; width: 100%; position: fixed; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useGSAP(() => {
    if (!mounted) return;

    const coords = [
      { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 },
      { x: 100, y: 200 }, { x: 0, y: 200 }, { x: 0, y: 300 },
      { x: 100, y: 300 }, { x: 100, y: 400 }, { x: 0, y: 400 }, { x: 0, y: 500 },
    ];

    function gotoSection(direction: number) {
      if (isAnimating.current) return;

      const nextIndex = currentIndex.current + direction;
      if (nextIndex < 0 || nextIndex >= coords.length) return;

      isAnimating.current = true;
      currentIndex.current = nextIndex;
      setActivePage(nextIndex);

      const target = coords[nextIndex]!;

      gsap.to(containerRef.current, {
        xPercent: -target.x,
        yPercent: -target.y,
        duration: 1.0, 
        ease: "power3.inOut",
        onComplete: () => { isAnimating.current = false; }
      });
    }

    const obs = Observer.create({
      target: window,
      type: "wheel,touch,pointer",
      wheelSpeed: -1,
      tolerance: 10,
      preventDefault: true,
      onDown: () => gotoSection(-1), 
      onUp: () => gotoSection(1),
    });

    return () => obs.kill();
  }, { scope: containerRef, dependencies: [mounted] });

  const handleGoToTop = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    currentIndex.current = 0;
    setActivePage(0);
    
    gsap.to(containerRef.current, {
      xPercent: 0,
      yPercent: 0,
      duration: 1.5,
      ease: "power4.inOut",
      onComplete: () => { isAnimating.current = false; }
    });
  };

  // UPDATED: Much larger base sizes for mobile readability
  const getDescClass = (text: string) => {
    const len = text.length;
    // Mobile: Base text is now 11px/12px (up from 9px/10px)
    // Desktop: Remained untouched (md:text-xs/sm)
    if (len > 120) return "text-[11px] md:text-xs leading-snug";
    if (len > 80) return "text-xs md:text-sm leading-snug"; 
    return "text-xs md:text-base leading-normal"; 
  };

  const renderHeading = (title: string) => {
    const lowerTitle = title.toLowerCase().trim();
    if (lowerTitle === "macro scenario explorer") {
      return (
        <>
          <span className="text-white">Macro Scenario</span> <br/>
          <span className="text-blue-600">Explorer</span>
        </>
      );
    }
    const words = title.split(' ');
    return (
      <>
        <span className="text-white">{words[0]}</span> <br/>
        <span className="text-blue-600">{words.slice(1).join(' ')}</span>
      </>
    );
  };

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 bg-[#020617] overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,_#1d4ed815_0%,_transparent_50%)] pointer-events-none z-0" />
      
      <main 
        ref={containerRef} 
        className="w-[100vw] relative z-10 flex flex-wrap content-start"
        style={{ 
           marginTop: NAV_HEIGHT, 
           height: `calc(100dvh - ${NAV_HEIGHT})`,
           width: "100vw"
        }}
      >
        
        {/* ---------------- PAGE 1 ---------------- */}
        <section className="
          w-screen h-full
          flex flex-col lg:flex-row flex-shrink-0
          overflow-hidden relative
        ">
          
          {/* LEFT: Title Area (Unchanged) */}
          <div className="
            w-full lg:w-[30%] lg:h-full
            flex flex-col justify-end lg:justify-center 
            p-4 lg:p-12 
            shrink-0 relative z-20
          ">
            <h1 className="text-5xl lg:text-[4vw] font-black tracking-tighter leading-[0.85] uppercase drop-shadow-[0_0_25px_rgba(255,255,255,0.2)]">
              <span className="text-white">Control</span> <br/> 
              <span className="text-blue-600">Center</span>
            </h1>
          </div>
          
          {/* RIGHT: Feature Grid */}
          <div className="w-full lg:w-[70%] h-full relative flex-1 min-h-0">
            <div className="
               w-full h-full
               p-3 lg:p-12
               flex flex-col
            ">
              <div className="grid grid-cols-2 gap-2 lg:gap-6 h-full content-stretch pb-4 lg:pb-0">
                {CORE_FEATURES.slice(0, 6).map((f) => (
                  <Link key={f.id} href={f.href} className="group relative bg-white/5 backdrop-blur-xl border border-white/10 p-3 lg:p-8 rounded-xl lg:rounded-2xl hover:border-blue-500/50 transition-all flex flex-col justify-between shadow-2xl overflow-hidden">
                    <div className="relative z-10 flex flex-col h-full">
                      
                      {/* FIXED: Title size bumped to text-xs/sm (was 10px) */}
                      <h3 className="font-bold uppercase text-xs sm:text-sm lg:text-xl mb-1 lg:mb-4 tracking-tight leading-tight">
                        {renderHeading(f.title)}
                      </h3>
                      
                      {/* FIXED: Description uses updated getDescClass for larger mobile font */}
                      <p className={`${getDescClass(f.desc)} text-slate-400 font-medium transition-all group-hover:text-slate-300 line-clamp-4 lg:line-clamp-none`}>
                        {f.desc}
                      </p>
                    </div>
                    
                    <ArrowUpRight className="absolute bottom-2 right-2 lg:bottom-6 lg:right-6 text-blue-600 w-4 h-4 lg:w-5 lg:h-5 opacity-80 group-hover:opacity-100 transition-all" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- PAGES 2-9 (Unchanged) ---------------- */}
        {CORE_FEATURES.map((feature, idx) => {
          const xPos = [0, 100, 100, 0, 0, 100, 100, 0][idx]; 
          const yPos = [100, 100, 200, 200, 300, 300, 400, 400][idx];

          return (
            <section 
              key={feature.id} 
              className="absolute w-screen h-full flex items-center justify-center px-4 lg:px-12"
              style={{ left: `${xPos}vw`, top: `${yPos}%` }}
            >
              <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-20">
                <div className="space-y-2 lg:space-y-4 flex flex-col justify-center">
                  <span className="text-blue-500 font-mono text-[10px] lg:text-xs uppercase tracking-widest">Module 0{idx + 1}</span>
                  <h2 className="text-5xl lg:text-8xl font-black uppercase tracking-tighter leading-none">
                    {renderHeading(feature.title)}
                  </h2>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 lg:p-14 rounded-[2rem] lg:rounded-[3.5rem] backdrop-blur-2xl flex flex-col justify-center">
                  <p className="text-base lg:text-3xl text-slate-300 font-light leading-snug mb-6 lg:mb-10">
                    {feature.desc}
                  </p>
                  <Link href={feature.href}>
                    <motion.button whileHover={{ scale: 1.05 }} className="bg-blue-600 text-white px-8 lg:px-12 py-3 lg:py-6 rounded-full font-bold flex items-center gap-3 text-sm lg:text-base shadow-lg shadow-blue-900/20">
                      Launch Module <ArrowUpRight />
                    </motion.button>
                  </Link>
                </div>
              </div>
            </section>
          );
        })}
        
        {/* FINAL PAGE */}
        <section 
          className="absolute w-screen h-full flex items-center justify-center" 
          style={{ left: '0vw', top: '500%' }}
        >
          <p className="font-mono text-xs lg:text-sm uppercase tracking-[1em] opacity-10">End of Suite</p>
        </section>
      </main>

      <AnimatePresence>
        {activePage > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={handleGoToTop}
            className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-50 bg-blue-600 text-white p-3 lg:p-4 rounded-full shadow-2xl hover:bg-blue-500 transition-colors"
          >
            <ChevronUp className="w-5 h-5 lg:w-6 lg:h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}