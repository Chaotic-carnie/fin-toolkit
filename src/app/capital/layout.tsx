"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CapitalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The routes match the new folder names we just set up
  const tabs = [
    { name: "Capital", path: "/capital/budgeting" }, 
    { name: "Capital Allocation", path: "/capital/allocation" },
    { name: "Margins", path: "/capital/margins" },
    { name: "Exposure", path: "/capital/exposure" },
  ];

  return (
    // We lock the height here. Subtract 64px for your global top navbar.
    <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-[#020617] text-white overflow-hidden">
      
      {/* Sub-Navigation Pill Menu */}
      <div className="shrink-0 h-14 border-b border-white/5 flex items-center px-6 gap-2 bg-[#020617] z-50">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.path);
          return (
            <Link key={tab.path} href={tab.path}>
              <div 
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                    : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {tab.name}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Content Area - This passes the remaining height perfectly to the tools */}
      <div className="flex-1 min-h-0 w-full relative">
        {children}
      </div>
    </div>
  );
}