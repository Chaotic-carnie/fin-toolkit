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
];

export function Navbar() {
  const pathname = usePathname();

  return (
    // FIXED: Added 'h-16' (height) and boosted z-index to 'z-[100]'
    // Added border-b back so it doesn't blend into the dark page background
    <nav className="fixed top-0 left-0 w-full h-16 z-[100] bg-[#020617]/80 backdrop-blur-md border-b border-white/10 px-6">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
        
        {/* Logo Section */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 bg-blue-500 rounded-lg group-hover:rotate-12 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tighter text-lg text-white">PEEYUSH LABS</span>
          </Link>
          
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button 
                  variant="ghost" 
                  className={`text-xs font-medium px-4 h-8 transition-all duration-200 ${
                    pathname === link.href 
                      ? 'text-blue-400 bg-blue-500/10' 
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.name}
                </Button>
              </Link>
            ))}
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
    </nav>
  );
}