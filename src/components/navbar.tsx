"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Menu, X } from "lucide-react"; // Added Menu and X icons

const NAV_LINKS = [
  { name: "Pricer", href: "/pricer" },
  { name: "Portfolio", href: "/portfolio" },
  { name: "Strategy", href: "/strategy" },
  { name: "Macro", href: "/macro" },
  { name: "Tax", href: "/tax" },
  { name: "Scenario", href: "/scenario" },
  { name: "Capital", href: "/capital" },
  { name: "About Us", href: "/about" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auto-close the mobile menu whenever the user navigates to a new page
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Lock the background scrolling when the side drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      // FIX: Reset to empty string so Tailwind's default CSS takes over. 
      // "auto" was forcing a secondary Windows/Linux scrollbar to render!
      document.body.style.overflow = ""; 
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-40 bg-[#020617]/80 backdrop-blur-md border-b border-white/10 px-4 lg:px-6">
        
        {/* ================= DESKTOP & MOBILE HEADER ================= */}
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          
          {/* Logo Section */}
          <div className="flex items-center gap-8 w-full lg:w-auto">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="p-1.5 bg-blue-500 rounded-lg group-hover:rotate-12 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold tracking-tighter text-lg text-white">PEEYUSH LABS</span>
            </Link>
            
            {/* Desktop Links (Hidden on Mobile) */}
            <div className="hidden lg:flex items-center gap-1 ml-auto">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(`${link.href}/`));

                return (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={`inline-flex items-center justify-center rounded-md text-xs font-medium px-4 h-8 transition-all duration-200 ${
                      isActive 
                        ? 'text-blue-400 bg-blue-500/10' 
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Mobile Hamburger Button (Hidden on Desktop) */}
          <button 
            className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors ml-auto"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* ================= MOBILE SIDE DRAWER ================= */}
      
      {/* 1. Dark Backdrop Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Slide-in Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-64 sm:w-80 bg-[#0B1121] border-l border-white/10 z-50 lg:hidden transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          <span className="font-bold tracking-widest text-xs text-white flex items-center gap-2 uppercase">
            <Zap className="w-4 h-4 text-blue-500" /> Menu
          </span>
          <button 
            className="p-2 text-slate-400 hover:text-rose-400 transition-colors bg-white/5 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/30"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Links */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 dark-scrollbar">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(`${link.href}/`));
            return (
              <Link 
                key={link.href} 
                href={link.href} 
                className={`flex items-center px-4 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 border ${
                  isActive 
                    ? 'text-blue-400 bg-blue-500/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                    : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5 bg-slate-900/50'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
        
        {/* Drawer Footer */}
        <div className="p-4 border-t border-white/10 shrink-0 bg-black/20">
           <div className="text-[10px] text-slate-500 font-mono tracking-widest text-center uppercase">
             Peeyush Labs Engine
           </div>
        </div>
      </div>
    </>
  );
}