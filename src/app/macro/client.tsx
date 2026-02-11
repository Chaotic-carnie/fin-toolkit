"use client";

import { useEffect, useState } from "react";
import type { MarketSnapshot, EconomicEvent, PortfolioPosition } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCcw, Info } from "lucide-react";
import { MacroChart } from "@/features/macro/components/MacroChart";
import { RiskHeatmap } from "@/features/macro/components/RiskHeatmap";
import { MacroControls } from "@/features/macro/components/MacroControls";
import { HistoricalReplay } from "@/features/macro/components/HistoricalReplay";
import { EconomicCalendar } from "@/features/macro/components/EconomicCalendar";
import { PnLAttribution } from "@/features/macro/components/PnLAttribution";
import { useMacroStore } from "@/features/macro/store";
import { refreshMarketData, fetchCalendarEvents } from "./actions";
import { toast } from "sonner";
import { ScenarioManager } from "@/features/macro/components/ScenarioManager";
import { PortfolioManager } from "@/features/macro/components/PortfolioManager"; 

interface Props {
  snapshot: MarketSnapshot;
  events: EconomicEvent[];
  positions: PortfolioPosition[];
}

export function MacroClient({ snapshot, events: serverEvents, positions }: Props) {
  const { setBaseData, calculateRisk, totalPnl, setShocks, setPortfolio, hydrated } = useMacroStore();
  
  const [events, setEvents] = useState<EconomicEvent[]>(serverEvents || []);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize Data
  useEffect(() => {
    setBaseData({
      usdinr: snapshot.usdinr,
      inr3m: snapshot.inr3m,
      inr10y: snapshot.inr10y
    });
    setTimeout(() => calculateRisk(), 100);
  }, [snapshot, setBaseData, calculateRisk]);

  // Sync DB Positions
  useEffect(() => {
    if (positions) {
        setPortfolio(positions);
    }
  }, [positions, setPortfolio]);

  const handleYearChange = async (year: string) => {
    setSelectedYear(year);
    const res = await fetchCalendarEvents(parseInt(year));
    if (res.success && res.events) setEvents(res.events as EconomicEvent[]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
        await refreshMarketData();
        toast.success("Market Data Updated");
    } catch(e) {
        console.error(e);
    } finally {
        setIsRefreshing(false);
    }
  };

  const handleEventClick = (ev: EconomicEvent) => {
    if (ev.event.includes("FOMC")) {
        setShocks({ shortRateBps: 25, longRateBps: 15, fxShockPct: 1.2, horizonDays: 7 });
        toast.info("Applied FOMC Volatility Scenario");
    } else {
        toast.info("Scenario Selected: " + ev.event);
    }
  };

  // Prevent hydration mismatch
  if (!hydrated) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start pb-10">
      
      {/* LEFT: Controls */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <Card className="p-6 bg-slate-900 border-white/10 shadow-xl z-20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-200">Scenario Builder</h3>
            <div className="flex gap-2 items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-emerald-400" onClick={handleRefresh}>
                        <RefreshCcw className={isRefreshing ? "animate-spin" : ""} size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200 text-xs">
                      <p>Refresh live market rates</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <ScenarioManager />
            </div>
          </div>
          <MacroControls />
        </Card>

        {/* Calendar */}
        <Card className="p-4 bg-slate-900 border-white/10 shadow-lg h-[480px] flex flex-col overflow-hidden">
           <div className="flex justify-between items-center mb-4 px-1 shrink-0">
             <h4 className="text-sm font-semibold text-slate-200">Event Schedule</h4>
             <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[80px] h-7 text-xs bg-slate-800 border-slate-700 text-slate-200 focus:ring-slate-600">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 z-50">
                    <SelectItem value="2025" className="text-slate-300 focus:bg-slate-800 focus:text-white cursor-pointer">2025</SelectItem>
                    <SelectItem value="2026" className="text-slate-300 focus:bg-slate-800 focus:text-white cursor-pointer">2026</SelectItem>
                </SelectContent>
             </Select>
           </div>
           <div className="flex-1 min-h-0">
             <EconomicCalendar events={events} onEventClick={handleEventClick} />
           </div>
        </Card>
      </div>

      {/* RIGHT: Analysis */}
      <div className="lg:col-span-8 flex flex-col gap-6 pt-2">
        
        {/* Header & Portfolio Manager */}
        <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-white/5">
            <div>
                <h2 className="text-xl font-bold text-slate-100 tracking-tight">Active Portfolio Risk</h2>
                <div className="flex gap-6 mt-1">
                    <div className="text-xs text-slate-400">
                        Est. P&L: <span className={`font-mono font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalPnl)}
                        </span>
                    </div>
                    <div className="text-xs text-slate-400">
                         VaR (95%): <span className="text-slate-200 font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(totalPnl * 1.65))}</span>
                    </div>
                </div>
            </div>
            <PortfolioManager positions={positions} />
        </div>

        {/* 1. Historical Replay (Top Priority) */}
        <Card className="p-6 bg-slate-900 border-white/10 shadow-lg min-h-[400px]">
           <div className="flex items-center gap-2 mb-4">
               <h4 className="font-semibold text-slate-200">Historical Stress Replay</h4>
               <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">Scenario Mode</span>
           </div>
           <HistoricalReplay />
        </Card>

        {/* 2. Risk Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-slate-900 border-white/10 shadow-lg flex flex-col items-center justify-center">
               <RiskHeatmap />
            </Card>
            
            {/* 3. P&L Attribution */}
            <Card className="p-6 bg-slate-900 border-white/10 shadow-lg">
               <PnLAttribution />
            </Card>
        </div>

        {/* 4. Yield Curve (Separate Box) */}
        <Card className="p-6 bg-slate-900 border-white/10 shadow-lg">
           <div className="flex items-center justify-between mb-4">
               <h4 className="font-semibold text-slate-200">Yield Curve Dynamics</h4>
           </div>
           <div className="h-[300px]">
               <MacroChart />
           </div>
        </Card>
      </div>
    </div>
  );
}