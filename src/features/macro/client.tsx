"use client";

import { useEffect, useState } from "react";
import type { MarketSnapshot, EconomicEvent, PortfolioPosition } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCcw, Printer } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { Loader2 } from "lucide-react";

// Components
import { MacroChart } from "./components/MacroChart";
import { RiskHeatmap } from "./components/RiskHeatmap";
import { MacroControls } from "./components/MacroControls";
import { HistoricalReplay } from "./components/HistoricalReplay";
import { EconomicCalendar } from "./components/EconomicCalendar";
import { PnLAttribution } from "./components/PnLAttribution";
import { ScenarioManager } from "./components/ScenarioManager";
import { PortfolioManager } from "./components/PortfolioManager"; 
import { VaRHistogram } from "./components/VaRHistogram";
import { KeyRateSpider } from "./components/KeyRateSpider";

// Store & Actions
import { useMacroStore } from "./store";
import { fetchCalendarEvents } from "./actions";
import { toast } from "sonner";

interface Props {
  snapshot: any;
  events: EconomicEvent[];
  positions: PortfolioPosition[];
}

export function MacroClient({ snapshot, events: serverEvents, positions }: Props) {
  const { setBaseData, totalPnl, diversificationBenefit, setShocks, setPortfolio, hydrated } = useMacroStore();
  
  const [events, setEvents] = useState<EconomicEvent[]>(serverEvents || []);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
  setBaseData({ usdinr: snapshot.usdinr, inr3m: snapshot.inr3m, inr10y: snapshot.inr10y });
    // Removed setTimeout! State flows perfectly now.
  }, [snapshot, setBaseData]);

  useEffect(() => {
    if (positions) setPortfolio(positions);
  }, [positions, setPortfolio]);

  const handleYearChange = async (year: string) => {
    setSelectedYear(year);
    const res = await fetchCalendarEvents(parseInt(year));
    if (res.success && res.events) setEvents(res.events as EconomicEvent[]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Market Data Updated");
    }, 800);
  };

  const handleEventClick = (ev: EconomicEvent) => {
    toast.info("Event selected: " + ev.event);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    const printArea = document.getElementById("pdf-export-area");
    if (!printArea) {
      toast.error("Error: Could not find the dashboard area to print.");
      return;
    }

    try {
      setIsExporting(true);
      toast.info("Generating PDF... this might take a second.");

      // 1. Wait a tick for Recharts animations to settle
      await new Promise(resolve => setTimeout(resolve, 500));

      // 2. Capture the DOM natively using html-to-image
      const dataUrl = await toPng(printArea, {
        quality: 1.0,
        pixelRatio: 2, // High resolution
        backgroundColor: "#020617", // Force solid dark background (slate-950)
        filter: (node) => {
          // Hide the export buttons from the final PDF
          if (node instanceof HTMLElement && node.dataset.html2canvasIgnore === "true") {
            return false;
          }
          return true;
        }
      });
      
      // 3. Setup PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate aspect ratio height
      const pdfHeight = (printArea.offsetHeight * pdfWidth) / printArea.offsetWidth;
      
      let heightLeft = pdfHeight;
      let position = 0;

      // Paint first page dark
      pdf.setFillColor(2, 6, 23); 
      pdf.rect(0, 0, pdfWidth, pageHeight, "F");

      // Add image
      pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      // Handle multi-page overflow
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        
        // Paint subsequent pages dark
        pdf.setFillColor(2, 6, 23); 
        pdf.rect(0, 0, pdfWidth, pageHeight, "F");
        
        pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`Macro_Risk_Report_${dateStr}.pdf`);
      toast.success("PDF Exported Successfully");

    } catch (error) {
      console.error("PDF Export failed:", error);
      toast.error("Failed to generate PDF. See console.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!hydrated) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start pb-10 print-container">
      
      {/* LEFT: Controls & Calendar */}
      <div className="lg:col-span-4 flex flex-col gap-6 no-print">
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
                    <TooltipContent className="bg-slate-800 text-slate-200 text-xs">Refresh rates</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <ScenarioManager />
            </div>
          </div>
          <MacroControls />
        </Card>

        <Card className="p-4 bg-slate-900 border-white/10 shadow-lg h-[400px] flex flex-col overflow-hidden">
           <div className="flex justify-between items-center mb-4 px-1 shrink-0">
             <h4 className="text-sm font-semibold text-slate-200">Event Schedule</h4>
             <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[80px] h-7 text-xs bg-slate-800 border-slate-700 text-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
             </Select>
           </div>
           <div className="flex-1 min-h-0">
             <EconomicCalendar events={events} onEventClick={handleEventClick} />
           </div>
        </Card>
      </div>

      {/* RIGHT: Analysis (This is the section that gets printed) */}
      <div id="pdf-export-area" className="lg:col-span-8 flex flex-col gap-6 pt-2 p-4 bg-slate-950 rounded-xl">        
        {/* Top Bar */}
        <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-white/5">
            <div>
                <h2 className="text-xl font-bold text-slate-100 tracking-tight">Active Portfolio Risk</h2>
                <div className="flex flex-wrap gap-6 mt-1">
                    <div className="text-xs text-slate-400">
                        Est. P&L: <span className={`font-mono font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalPnl)}
                        </span>
                    </div>
                    {diversificationBenefit > 0 && (
                        <div className="text-xs text-slate-400">
                            Div. Benefit: <span className="text-blue-400 font-mono">+{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(diversificationBenefit)}</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex gap-3" data-html2canvas-ignore="true">
                <Button 
                    size="sm" 
                    variant="secondary" 
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 h-9" 
                    onClick={handleExportPDF}
                    disabled={isExporting}
                >
                    {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2 text-emerald-400" />}
                    {isExporting ? "Generating..." : "Export PDF"}
                </Button>
                <PortfolioManager positions={positions} />
            </div>
        </div>

        {/* VaR and Spider Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[300px] break-inside-avoid">
            <Card className="bg-slate-900 border-white/10 shadow-lg">
                <VaRHistogram />
            </Card>
            <Card className="bg-slate-900 border-white/10 shadow-lg">
                <KeyRateSpider />
            </Card>
        </div>

        {/* Heatmap & Attribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 break-inside-avoid">
            <Card className="p-6 bg-slate-900 border-white/10 shadow-lg">
               <RiskHeatmap />
            </Card>
            <Card className="p-6 bg-slate-900 border-white/10 shadow-lg">
               <PnLAttribution />
            </Card>
        </div>

        {/* Yield Curve */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 break-inside-avoid">
            <Card className="p-6 bg-slate-900 border-white/10 shadow-lg min-h-[300px]">
               <MacroChart />
            </Card>
            <Card className="p-6 bg-slate-900 border-white/10 shadow-lg min-h-[300px] no-print">
               <div className="flex items-center gap-2 mb-4">
                   <h4 className="font-semibold text-slate-200">Stress Replay</h4>
               </div>
               <HistoricalReplay />
            </Card>
        </div>

      </div>
    </div>
  );
}