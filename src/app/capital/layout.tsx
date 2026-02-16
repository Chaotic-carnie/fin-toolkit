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
    // MOBILE FIX: Changed h-[calc...] to h-screen and added pt-28 (mobile) / pt-20 (desktop) to clear the top Navbars.
    <div className="flex flex-col h-screen w-full bg-[#020617] text-white overflow-hidden pt-15 lg:pt-2 pb-20">
      
      {/* Sub-Navigation Pill Menu */}
      {/* MOBILE FIX: Added overflow-x-auto, dark-scrollbar, and w-full so the pills swipe left/right on phones */}
      <div className="shrink-0 h-14 border-b border-white/5 flex items-center px-4 lg:px-6 gap-2 bg-[#020617] z-50 overflow-x-auto dark-scrollbar w-full">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.path);
          return (
            // MOBILE FIX: shrink-0 prevents the flexbox from crushing the buttons on small screens
            <Link key={tab.path} href={tab.path} className="shrink-0">
              <div 
                // MOBILE FIX: Responsive padding and text size, plus whitespace-nowrap to prevent line breaks
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
      {/* MOBILE FIX: Added overflow-y-auto for mobile so the children can scroll natively without getting trapped */}
      <div className="flex-1 min-h-0 w-full relative overflow-y-auto lg:overflow-hidden dark-scrollbar">
        {children}
      </div>
      
    </div>
  );
}