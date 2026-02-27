"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Layers,
  Download,
  Loader2,
  Presentation,
  RefreshCcw,
  LayoutDashboard,
  Table2,
  Flame,
  Banknote,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { toJpeg } from "html-to-image";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";

import { Dashboard } from "~/features/jpmc/components/Dashboard";
import { HoldingsTable } from "~/features/jpmc/components/HoldingsTable";
import { ScenarioLab } from "~/features/jpmc/components/ScenarioLab";
import { BalanceSheetPanel } from "~/features/jpmc/components/BalanceSheetPanel";
import { JpmcStatsBanner } from "~/features/jpmc/components/JpmcStatsBanner";

import { useJpmcTrackerStore } from "~/features/jpmc/store";
import { buildHoldingsStressPack } from "~/features/jpmc/engine";

export const dynamic = "force-dynamic";

export default function JpmcTrackerPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [mounted, setMounted] = useState(false);

  const {
    holdingsReport,
    loading,
    error,
    notice,
    fetchHoldings,
    fetchBalanceSheet,
    setHoldingsScenario,
    setCategoryHaircut,
    clearOverrides,
    clearCategoryHaircuts,
  } = useJpmcTrackerStore();

  useEffect(() => {
    setMounted(true);
    useJpmcTrackerStore.getState().fetchHoldings();
    useJpmcTrackerStore.getState().fetchBalanceSheet();
  }, []);

  useEffect(() => {
    if (isExporting) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isExporting]);

  const reportDate = holdingsReport?.meta.reportDate;

  const handleRefresh = async () => {
    toast.info("Refreshing SEC feeds…");
    await Promise.all([fetchHoldings(), fetchBalanceSheet()]);
    toast.success("Refreshed");
  };

  const handleDemo = async () => {
    const toastId = toast.loading("Applying Demo Settings...");
    try {
      let currentHoldings = useJpmcTrackerStore.getState().holdingsReport?.holdings;
      
      if (!currentHoldings || currentHoldings.length === 0) {
        await fetchHoldings();
        currentHoldings = useJpmcTrackerStore.getState().holdingsReport?.holdings ?? [];
      }

      clearOverrides();
      clearCategoryHaircuts();

      const pack = buildHoldingsStressPack(currentHoldings);
      const demoPreset = pack.find((p) => p.key === "CRASH") ?? pack[0];

      if (demoPreset) {
        setHoldingsScenario(demoPreset.scenario);
      }

      setCategoryHaircut("TradingAssets", -7);
      setCategoryHaircut("AvailableForSaleSecuritiesDebtSecurities", -5);
      setCategoryHaircut("HeldToMaturitySecuritiesDebtSecurities", -4);
      setCategoryHaircut("LoansReceivableNet", -2);
      setCategoryHaircut("Goodwill", -15);
      setCategoryHaircut("IntangibleAssetsNetExcludingGoodwill", -15);

      setActiveTab("dashboard");
      toast.success("Demo active: Crash preset & haircuts applied.", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load demo scenario", { id: toastId });
    }
  };

  const handleExportPDF = async () => {
    if (!containerRef.current) return;

    try {
      setIsExporting(true);
      const originalTab = activeTab; 
      const pdf = new jsPDF("l", "mm", "a4");
      
      const tabsToPrint = [
        { id: "dashboard", name: "Dashboard" },
        { id: "holdings", name: "Holdings Table" },
        { id: "scenario", name: "Scenario Lab" },
        { id: "balance", name: "Balance Sheet" }
      ];

      let isFirstPage = true;

      const style = document.createElement("style");
      style.innerHTML = `* { scrollbar-width: none !important; } *::-webkit-scrollbar { display: none !important; }`;
      document.head.appendChild(style);

      for (let i = 0; i < tabsToPrint.length; i++) {
        const tab = tabsToPrint[i];
        setExportProgress(`Capturing ${tab.name} (${i + 1}/${tabsToPrint.length})...`);
        
        setActiveTab(tab.id);
        
        await new Promise((resolve) => setTimeout(resolve, 800));

        const dataUrl = await toJpeg(containerRef.current, {
          quality: 0.85,
          pixelRatio: 1.5,
          backgroundColor: "#020617",
          filter: (node) => {
            if (node instanceof HTMLElement && node.dataset.html2canvasIgnore === "true") return false;
            return true;
          },
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let heightLeft = pdfHeight;
        let position = 0;

        if (!isFirstPage) pdf.addPage();
        isFirstPage = false;

        pdf.setFillColor(2, 6, 23);
        pdf.rect(0, 0, pdfWidth, pageHeight, "F");
        pdf.addImage(dataUrl, "JPEG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.setFillColor(2, 6, 23);
          pdf.rect(0, 0, pdfWidth, pageHeight, "F");
          pdf.addImage(dataUrl, "JPEG", 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }
      }

      setExportProgress("Finalizing PDF Document...");
      
      const dateStr = new Date().toISOString().split("T")[0];
      pdf.save(`JPMC_Portfolio_Radar_${dateStr}.pdf`);
      
      document.head.removeChild(style);
      setActiveTab(originalTab);
      toast.success("PDF exported successfully!");

    } catch (e) {
      console.error("Export failed:", e);
      toast.error("Failed to generate PDF. See console.");
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#020617] text-slate-500 font-mono text-sm">
        LOADING JPMC RADAR…
      </div>
    );
  }

  const tabTriggerClasses = "px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 bg-transparent shadow-none border-b-2 border-transparent hover:text-slate-300 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-400 data-[state=active]:border-blue-500 transition-all flex items-center gap-2 rounded-none";

  return (
    <>
      {isExporting && (
        <div className="fixed inset-0 z-[9999] bg-[#020617]/90 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-200">Generating Report</h2>
          <p className="text-slate-400 font-mono mt-2 animate-pulse">{exportProgress}</p>
        </div>
      )}

      {/* Main container scrolling */}
      <div className="flex-1 w-full overflow-y-auto dark-scrollbar bg-[#020617]">
        <div
          ref={containerRef}
          className={`flex flex-col bg-[#020617] text-white font-sans relative ${isExporting ? "w-[1600px] h-auto min-h-screen" : "w-full min-h-screen pt-28 lg:pt-2"}`}
        >
          {/* Gradient background securely placed beneath content */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent z-0" />

          {/* Header - Fixed transparency bleeding by ensuring bg-[#020617] and z-20 */}
          <div className="shrink-0 px-4 lg:px-6 py-4 border-b border-white/5 bg-[#020617] flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4 md:gap-2 relative z-20">
            <div className="w-full md:w-auto">
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-2 md:gap-3">
                JPMC <span className="text-blue-600">Portfolio Radar</span>
              </h1>
              <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1 ml-1 flex items-center gap-1.5 md:gap-2 flex-wrap">
                <Layers className="w-3 h-3 text-blue-500 shrink-0" /> Public disclosure tracker (13F + SEC XBRL) • Stress pack • Attribution
              </p>
            </div>

            {/* Buttons - added flex-wrap and sm:flex-nowrap for mobile tightness */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full md:w-auto justify-start md:justify-end" data-html2canvas-ignore="true">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[9px] uppercase font-bold text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors flex-1 sm:flex-none"
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                <Download className="w-3 h-3 mr-1.5 shrink-0" /> <span className="whitespace-nowrap">Export Report</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[9px] uppercase font-bold text-slate-200 border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex-1 sm:flex-none"
                onClick={handleRefresh}
                disabled={loading.holdings || loading.balanceSheet || isExporting}
              >
                <RefreshCcw className="w-3 h-3 mr-1.5 shrink-0" /> <span className="whitespace-nowrap">Refresh</span>
              </Button>

              <span className="text-[10px] font-mono text-slate-600 bg-white/5 px-2 py-1 rounded border border-white/5 hidden sm:block whitespace-nowrap">
                {reportDate ? `AS OF ${reportDate}` : "SEC FEED"}
              </span>
            </div>
          </div>

          {/* Notices - Also protected with relative z-20 */}
          {notice && !isExporting && (
            <div className="shrink-0 px-4 lg:px-6 py-2 border-b border-amber-500/20 bg-amber-500/10 text-amber-200 text-[11px] font-mono flex items-center gap-2 relative z-20">
              <ShieldAlert className="w-4 h-4 shrink-0" /> {notice}
            </div>
          )}
          {error && !isExporting && (
            <div className="shrink-0 px-4 lg:px-6 py-2 border-b border-rose-500/20 bg-rose-500/10 text-rose-200 text-[11px] font-mono flex items-center gap-2 relative z-20">
              <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Banner Container - Added bg-[#020617] to ensure scrolling items don't bleed through on mobile */}
          <div className="shrink-0 w-full overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden relative z-20 bg-[#020617]">
            <JpmcStatsBanner />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 relative z-10">
            {/* Tabs List Wrapper - Changed from bg-transparent to bg-[#020617] to fix the mobile transparency bleed */}
            <div className="shrink-0 px-4 lg:px-6 border-b border-white/10 bg-[#020617] relative z-20 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
              <TabsList className="bg-transparent h-auto p-0 gap-2 md:gap-6 justify-start w-max">
                <TabsTrigger value="dashboard" className={tabTriggerClasses}>
                  <LayoutDashboard className="w-4 h-4 shrink-0" /> Dashboard
                </TabsTrigger>
                <TabsTrigger value="holdings" className={tabTriggerClasses}>
                  <Table2 className="w-4 h-4 shrink-0" /> Holdings
                </TabsTrigger>
                <TabsTrigger value="scenario" className={tabTriggerClasses}>
                  <Flame className="w-4 h-4 shrink-0" /> Scenario Lab
                </TabsTrigger>
                <TabsTrigger value="balance" className={tabTriggerClasses}>
                  <Banknote className="w-4 h-4 shrink-0" /> Balance Sheet
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 p-4 lg:p-6 pb-28 js-print-scroll relative z-10">
              <div className="max-w-[1800px] mx-auto">
                <TabsContent value="dashboard" className="m-0 border-none outline-none">
                  <Dashboard />
                </TabsContent>
                <TabsContent value="holdings" className="m-0 border-none outline-none">
                  <HoldingsTable />
                </TabsContent>
                <TabsContent value="scenario" className="m-0 border-none outline-none">
                  <ScenarioLab />
                </TabsContent>
                <TabsContent value="balance" className="m-0 border-none outline-none">
                  <BalanceSheetPanel />
                </TabsContent>
              </div>
            </div>
          </Tabs>

        </div>
      </div>
    </>
  );
}