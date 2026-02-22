"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Mail, Code2, LineChart, Target, 
  GraduationCap
} from "lucide-react";

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

// --- Team Data ---
const TEAM = [
  {
    name: "Peeyush Kumar Jha",
    nickname: "",
    degrees: ["M.Sc. Economics", "B.E. Computer Science"],
    badges: ["FRM Level I", "Finance Minor", "Quant"],
    bio: "Peeyush is deeply interested in finance, economic research, econometrics, and machine learning. He’s pursuing a Finance minor and has cleared FRM Level I. Outside academics, he enjoys lively debates, music, and occasionally cooking up quick meals in his room for friends.",
    contact: "peeyushkjha.12@gmail.com",
    icon: <LineChart className="w-5 h-5 text-emerald-400" />
  },
  {
    name: "Parth Jayanandan",
    nickname: "",
    degrees: ["M.Sc. Mathematics", "B.E. Computer Science"],
    badges: ["IITM Data Science", "Algo Optimization", "UI/UX"],
    bio: "Parth is passionate about computing, algorithmic optimization, UI/UX, development, and AI/ML. He also holds a Data Science degree from IIT Madras. When he’s not building or optimizing something, you’ll likely find him playing the clapbox, discussing where tech is headed, or enjoying a fierce game of Valo.",
    contact: "",
    icon: <Code2 className="w-5 h-5 text-blue-400" />
  },
  {
    name: "Naman Kaushik Shah",
    nickname: "Puchu",
    degrees: ["M.Sc. Mathematics", "B.E. Computer Science"],
    badges: ["Data Science Minor", "Arsenal Fan", "AI/ML"],
    bio: "Naman is interested in finance, data science, development, and AI, and he’s also pursuing a Data Science minor. Known for his always upbeat energy and smile, Puchu is someone who brings both focus and fun to the team. He loves frisbee, enjoys watching movies, and is a dedicated, diehard Arsenal fan.",
    contact: "",
    icon: <Target className="w-5 h-5 text-rose-400" />
  }
];

export default function AboutPage() {
  return (
    <div className="h-[calc(100dvh-64px)] w-full overflow-y-auto overflow-x-hidden dark-scrollbar bg-[#020617] text-white font-sans relative isolate selection:bg-blue-500/30">
      
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[500px] bg-emerald-600/5 rounded-full blur-[100px]" />
      </div>

      {/* NEW: FLOATING LEGACY BADGE */}
      {/* fixed bottom-6 left-6 keeps it permanently in the corner, z-50 keeps it clickable */}
      {/* NEW: FLOATING LEGACY BADGE - HIGH VISIBILITY VERSION */}
      <a 
        href="https://peeyush-jha-labs.onrender.com/" 
        target="_blank" 
        rel="noopener noreferrer"
        // THE CHANGES:
        // 1. Increased padding & darker, more opaque background for contrast.
        // 2. Added a distinct amber border and a powerful glowing shadow.
        // 3. Stronger hover lift effect.
        className="fixed bottom-6 left-4 md:bottom-8 md:left-8 z-50 group flex items-center gap-3 px-4 py-2.5 md:px-5 md:py-3 bg-slate-900/90 backdrop-blur-xl border-2 border-amber-500/30 hover:border-amber-400/80 rounded-full transition-all duration-300 shadow-[0_0_25px_rgba(245,158,11,0.2)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] hover:-translate-y-1.5"
      >
        <div className="relative flex items-center justify-center w-3 h-3">
          {/* Stronger, larger ping animation */}
          <span className="absolute w-full h-full rounded-full bg-amber-400/60 animate-ping opacity-75" />
          {/* Brighter core dot with its own glow */}
          <span className="relative w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,1)]" />
        </div>
        {/* Larger, brighter text */}
        <span className="text-[10px] md:text-xs font-black text-amber-100 group-hover:text-white uppercase tracking-widest transition-colors">
          V1 Legacy Env
        </span>
      </a>

      {/* THE FIX: Reduced the massive 'pt-24 md:pt-32' down to a clean 'pt-8 md:pt-12' because the page now starts exactly where the navbar ends */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-32">
        
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show"
          className="flex flex-col items-center max-w-5xl mx-auto space-y-16 md:space-y-24"
        >

          {/* 1. ABOUT US INTRO */}
          <motion.div variants={itemVariants} className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-xl md:text-2xl font-bold text-slate-200 leading-relaxed">
              We’re a team of three pre-final-year students from BITS GOA, building this website as a blend of curiosity, problem-solving, and craft. 
            </h2>
            <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
              Our interests span finance, data science, software development, and AI/ML, and we love turning complex ideas into clean, highly-useful quantitative products.
            </p>
            
            <div className="inline-flex flex-col items-center justify-center p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl mt-8">
              <Mail className="w-5 h-5 text-blue-400 mb-3" />
              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Send Suggestions To</p>
              <a href="mailto:peeyush@peeyush.co.in" className="text-sm md:text-base font-mono text-blue-400 hover:text-blue-300 transition-colors border-b border-blue-400/30 hover:border-blue-400 pb-0.5">
                peeyush@peeyush.co.in
              </a>
            </div>
          </motion.div>

          {/* 2. TEAM GRID */}
          <motion.div variants={itemVariants} className="w-full">
             <div className="flex items-center gap-4 mb-8 md:mb-12">
               <div className="h-px bg-white/10 flex-1" />
               <h3 className="text-sm md:text-base font-black uppercase tracking-widest text-slate-500">The Architects</h3>
               <div className="h-px bg-white/10 flex-1" />
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {TEAM.map((member, idx) => (
                  <motion.div 
                    key={member.name}
                    whileHover={{ y: -5 }}
                    className="bg-[#0B1121] border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col relative overflow-hidden group hover:border-white/20 transition-colors shadow-xl"
                  >
                    {/* Hover Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors" />

                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div>
                        <h4 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
                          {member.name} 
                        </h4>
                        {member.nickname && (
                          <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400 mt-1 block">
                            a.k.a. "{member.nickname}"
                          </span>
                        )}
                      </div>
                      <div className="p-2 bg-white/5 rounded-xl border border-white/10 shrink-0">
                        {member.icon}
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-6 relative z-10">
                      {member.degrees.map((deg, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <span className="text-xs md:text-sm font-bold text-slate-300">{deg}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6 relative z-10">
                      {member.badges.map(badge => (
                        <span key={badge} className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-[9px] uppercase tracking-widest font-bold text-slate-400">
                          {badge}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-8 flex-1 relative z-10">
                      {member.bio}
                    </p>

                    {member.contact && (
                      <div className="mt-auto pt-5 border-t border-white/10 relative z-10">
                        <a href={`mailto:${member.contact}`} className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-slate-500 hover:text-blue-400 transition-colors w-fit">
                          <Mail className="w-3.5 h-3.5" /> {member.contact}
                        </a>
                      </div>
                    )}
                  </motion.div>
                ))}
             </div>
          </motion.div>
          
        </motion.div>
      </main>
    </div>
  );
}