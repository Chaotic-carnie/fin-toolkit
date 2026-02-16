"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { Button } from "./ui/button";

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

  return (
    <nav className="fixed top-0 left-0 w-full z-40 bg-[#020617]/80 backdrop-blur-md border-b border-white/10 px-4 lg:px-6">
      
      {/* ================= DESKTOP ROW (100% Untouched Layout) ================= */}
      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
        
        {/* Logo Section */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="p-1.5 bg-blue-500 rounded-lg group-hover:rotate-12 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tighter text-lg text-white">PEEYUSH LABS</span>
          </Link>
          
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(`${link.href}/`));

              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  // FIX: Applied Button styles directly to Link to prevent a > button Hydration crash
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

        {/* Action Section */}
        <div className="flex items-center gap-4">
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-full transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]"
          >
            Login
          </Button>
        </div>
      </div>

      {/* ================= MOBILE ROW (Only visible on small screens) ================= */}
      <div className="lg:hidden w-full overflow-x-auto dark-scrollbar flex items-center gap-2 pb-3 pt-1">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(`${link.href}/`));
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`shrink-0 inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-wider px-3 h-7 transition-all duration-200 rounded-md border ${
                isActive 
                  ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' 
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5 bg-slate-900/50'
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

    </nav>
  );
}