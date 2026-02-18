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
    // THE FIX: 
    // 1. Changed to `h-[calc(100dvh-64px)]` to perfectly dock it exactly under the main navbar.
    // 2. Removed the `pt-15` and `pb-20` hacks because the flexbox now perfectly fits the screen.
    <div className="flex flex-col h-[calc(100dvh-64px)] w-full bg-[#020617] text-white overflow-hidden">
      
      {/* Sub-Navigation Pill Menu */}
      {/* THE FIX: Lowered z-50 to z-10 so it doesn't accidentally float above global modals/navbars */}
      <div className="shrink-0 h-14 border-b border-white/5 flex items-center px-4 lg:px-6 gap-2 bg-[#020617] relative z-10 overflow-x-auto dark-scrollbar w-full">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.path);
          return (
            <Link key={tab.path} href={tab.path} className="shrink-0">
              <div 
                className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-bold transition-all duration-200 whitespace-nowrap ${
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

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 w-full relative overflow-y-auto lg:overflow-hidden dark-scrollbar pb-10 lg:pb-0">
        {children}
      </div>
      
    </div>
  );
}