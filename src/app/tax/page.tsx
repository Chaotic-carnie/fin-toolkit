"use client";

import React, { useState } from 'react';
import { runTaxCompute } from '@/features/tax/engine';
import { AssetType, TaxComputeRequest, TaxComputeResponse } from '@/features/tax/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button"; 
import { Info, Calculator, TrendingUp, HelpCircle, ArrowRight } from 'lucide-react';

// Helper for consistent Label + Tooltip styling with new theme colors
const LabelHelp = ({ label, help }: { label: string, help: string }) => (
  <div className="flex items-center gap-1.5 mb-1.5">
    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</Label>
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3 h-3 text-slate-500 hover:text-blue-500 cursor-help transition-colors" />
      </TooltipTrigger>
      <TooltipContent className="bg-[#0f172a] border-white/10 text-slate-300 text-xs max-w-[250px] p-3 shadow-xl">
        {help}
      </TooltipContent>
    </Tooltip>
  </div>
);

export default function TaxPage() {
  const [form, setForm] = useState<TaxComputeRequest>({
    asset_type: "listed_equity_stt",
    acquired_date: "2025-02-12",
    sold_date: "2026-02-12",
    purchase_value: 100000,
    sale_value: 120000,
    transfer_expenses: 0,
    stt_paid: true,
    other_112a_ltcg_in_same_fy: 0,
    basic_exemption_remaining: 0,
    marginal_rate: 0.3,
    surcharge_rate: 0,
    cess_rate: 0.04,
    resident_individual_or_huf: true
  });

  const [result, setResult] = useState<TaxComputeResponse | null>(null);

  const handleCalculate = () => {
    const computed = runTaxCompute(form);
    setResult(computed);
  };

  return (
    <TooltipProvider delayDuration={200}>
      {/* THEME & LAYOUT FIXES:
         1. bg-[#020617]: Matches Home Page base.
         2. pt-24: Adds 96px top padding to clear the 64px Fixed Navbar.
         3. overflow-y-auto: Handles scrolling internally.
      */}
      <div className="fixed inset-0 bg-[#020617] overflow-y-auto dark-scrollbar pt-24 pb-32 px-4 md:px-8">
        
        {/* RADIAL GRADIENT BACKDROP (Matches Home Page) */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,_#1d4ed815_0%,_transparent_50%)] pointer-events-none z-0" />

        <div className="relative z-10 max-w-[1800px] mx-auto">
          
          <header className="mb-8 border-b border-white/10 pb-4 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
                Tax <span className="text-blue-600">Calculator</span>
              </h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                India Context • Capital Gains • VDA
              </p>
            </div>
            {!result && <div className="text-[10px] text-slate-500 font-mono hidden md:block">READY TO COMPUTE</div>}
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* ================= LEFT COLUMN: INPUTS ================= */}
            <div className="space-y-6">
              
              {/* 1. Transaction Details - Glassmorphism Card */}
              <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl">
                <CardHeader className="py-4 border-b border-white/5">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-500" /> Transaction Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div>
                    <LabelHelp label="Asset Type" help="Determines the tax section (111A, 112A, 115BBH) and holding period rules." />
                    <Select onValueChange={(v) => setForm({...form, asset_type: v as AssetType})} defaultValue={form.asset_type}>
                      <SelectTrigger className="bg-black/20 border-white/10 h-11 text-white text-xs font-bold uppercase focus:ring-blue-600/50"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#0f172a] border-white/10 text-white text-xs font-bold uppercase">
                        <SelectItem value="listed_equity_stt">Listed Equity (STT)</SelectItem>
                        <SelectItem value="listed_security_other">Listed Debt / Other</SelectItem>
                        <SelectItem value="land_building">Land / Building</SelectItem>
                        <SelectItem value="virtual_digital_asset">Virtual Digital Asset</SelectItem>
                        <SelectItem value="specified_mutual_fund_50aa">Specified MF (50AA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <LabelHelp label="Acquired Date" help="Date of purchase used to calculate holding period." />
                      <Input type="date" value={form.acquired_date} className="bg-black/20 border-white/10 h-10 text-white text-xs accent-blue-600" onChange={(e) => setForm({...form, acquired_date: e.target.value})} />
                    </div>
                    <div>
                      <LabelHelp label="Sold Date" help="Date of transfer used to calculate holding period." />
                      <Input type="date" value={form.sold_date} className="bg-black/20 border-white/10 h-10 text-white text-xs accent-blue-600" onChange={(e) => setForm({...form, sold_date: e.target.value})} />
                    </div>
                  </div>

                  <div>
                    <LabelHelp label="Cost of Acquisition (₹)" help="Purchase price + Brokerage (excluding STT)." />
                    <Input type="number" value={form.purchase_value} className="bg-black/20 border-white/10 h-10 text-white font-mono" onChange={(e) => setForm({...form, purchase_value: Number(e.target.value)})} />
                  </div>

                  <div>
                    <LabelHelp label="Sale Value (₹)" help="Total consideration received from the sale." />
                    <Input type="number" value={form.sale_value} className="bg-black/20 border-white/10 h-10 text-white font-mono" onChange={(e) => setForm({...form, sale_value: Number(e.target.value)})} />
                  </div>

                  <div>
                    <LabelHelp label="Transfer Expenses (₹)" help="Direct expenses like brokerage. Not allowed for VDA." />
                    <Input type="number" value={form.transfer_expenses} className="bg-black/20 border-white/10 h-10 text-white font-mono" onChange={(e) => setForm({...form, transfer_expenses: Number(e.target.value)})} />
                  </div>
                </CardContent>
              </Card>

              {/* 2. Rates */}
              <Card className="bg-white/5 backdrop-blur-md border border-white/10">
                <CardHeader className="py-3 px-6 border-b border-white/5">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tax Rates</CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-3 gap-4">
                  <div>
                    <LabelHelp label="Marginal Rate" help="Your applicable slab rate (e.g. 0.30)." />
                    <Input type="number" step="0.01" value={form.marginal_rate} className="bg-black/20 border-white/10 h-9 text-xs text-white" onChange={(e) => setForm({...form, marginal_rate: Number(e.target.value)})} />
                  </div>
                  <div>
                    <LabelHelp label="Surcharge" help="Applicable surcharge based on total income." />
                    <Input type="number" step="0.01" value={form.surcharge_rate} className="bg-black/20 border-white/10 h-9 text-xs text-white" onChange={(e) => setForm({...form, surcharge_rate: Number(e.target.value)})} />
                  </div>
                  <div>
                    <LabelHelp label="Cess" help="Health & Education Cess (default 0.04)." />
                    <Input type="number" step="0.01" value={form.cess_rate} className="bg-black/20 border-white/10 h-9 text-xs text-white" onChange={(e) => setForm({...form, cess_rate: Number(e.target.value)})} />
                  </div>
                </CardContent>
              </Card>

              {/* 3. Equity Specifics */}
              <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-lg">
                <CardHeader className="py-3 px-6 border-b border-white/5">
                  <CardTitle className="text-[10px] font-bold text-slate-300 uppercase italic tracking-widest">Equity-Specific Inputs</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center justify-between bg-black/20 p-3 rounded border border-white/10">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        id="stt" 
                        checked={form.stt_paid} 
                        onCheckedChange={(c) => setForm({...form, stt_paid: !!c})}
                        className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" 
                      />
                      <Label htmlFor="stt" className="text-[10px] font-black text-slate-200 uppercase tracking-tighter cursor-pointer">STT Paid (Eligible for 111A/112A)</Label>
                    </div>
                    <HelpCircle className="w-3 h-3 text-slate-600" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <LabelHelp label="Other 112A Gains (₹)" help="LTCG already realized this year." />
                      <Input type="number" value={form.other_112a_ltcg_in_same_fy} className="bg-black/20 border-white/10 h-9 text-xs text-white" onChange={(e) => setForm({...form, other_112a_ltcg_in_same_fy: Number(e.target.value)})} />
                    </div>
                    <div>
                      <LabelHelp label="Basic Exemption Left (₹)" help="Remaining basic exemption limit." />
                      <Input type="number" value={form.basic_exemption_remaining} className="bg-black/20 border-white/10 h-9 text-xs text-white" onChange={(e) => setForm({...form, basic_exemption_remaining: Number(e.target.value)})} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Action Button */}
              <Button 
                onClick={handleCalculate}
                className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all mb-10"
              >
                Calculate Tax Liability
              </Button>

            </div>

            {/* ================= RIGHT COLUMN: OUTPUTS ================= */}
            <div className="space-y-6">
              {!result ? (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl bg-white/5 min-h-[400px] backdrop-blur-sm">
                  <Calculator className="w-12 h-12 text-slate-700 mb-4 opacity-50" />
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Waiting for input...</p>
                </div>
              ) : (
                <>
                  {/* 1. Header Details */}
                  <Card className="bg-white/5 backdrop-blur-md border border-blue-500/30 shadow-2xl overflow-hidden">
                    <div className="bg-blue-900/10 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                      <div>
                        <LabelHelp label="Classification" help="Tax category based on asset type and holding period." />
                        <p className="text-3xl font-black text-white italic tracking-tighter uppercase">{result.classification}</p>
                      </div>
                      <div className="text-right">
                        <LabelHelp label="Holding Period" help="Total days asset was held." />
                        <p className="text-xl font-bold text-slate-300">{result.holding_days} <span className="text-xs text-slate-500">DAYS</span></p>
                      </div>
                    </div>
                    <div className="px-6 py-3 bg-black/20 border-b border-white/5">
                       <p className="text-[10px] text-slate-400 font-medium italic flex items-center gap-2">
                         <Info className="w-3 h-3 text-blue-500" /> {result.holding_period_rule}
                       </p>
                    </div>

                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/20 p-4 rounded border border-white/10">
                          <LabelHelp label="Gross Gain" help="Sale Value - Cost - Expenses" />
                          <p className="text-xl font-bold font-mono tracking-tighter text-white">₹{result.gain.toLocaleString()}</p>
                        </div>
                        <div className="bg-black/20 p-4 rounded border border-white/10">
                          <LabelHelp label="Taxable Gain" help="Gross Gain - Exemptions." />
                          <p className="text-xl font-bold font-mono tracking-tighter text-blue-400">₹{result.taxable_gain.toLocaleString()}</p>
                        </div>
                        <div className="bg-black/20 p-4 rounded border border-white/10">
                          <LabelHelp label="Base Rate" help="Applicable tax rate before Surcharge." />
                          <p className="text-xl font-bold font-mono tracking-tighter text-white">{(result.base_rate * 100).toFixed(2)}%</p>
                        </div>
                        <div className="bg-black/20 p-4 rounded border border-white/10">
                          <LabelHelp label="Total Tax Due" help="Final liability including Cess." />
                          <p className="text-xl font-bold font-mono tracking-tighter text-rose-500">₹{result.total_tax.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 3. Methodology */}
                  <Card className="bg-white/5 backdrop-blur-md border border-white/10">
                    <CardHeader className="py-3 border-b border-white/5">
                      <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logic Methodology</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-300 leading-relaxed font-medium mb-2">{result.methodology}</p>
                      <ul className="space-y-1">
                        {result.notes.map((n, i) => (
                          <li key={i} className="text-[10px] text-slate-500 italic flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span> {n}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* 4. Sensitivity Scenarios */}
                  <Card className="bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden">
                    <div className="bg-black/20 py-3 px-6 border-b border-white/10 flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Sensitivity (±10%)</span>
                      <Info className="w-3 h-3 text-slate-600" />
                    </div>
                    <Table>
                      <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className="text-[9px] font-bold text-slate-500 uppercase h-8">Shift</TableHead>
                          <TableHead className="text-[9px] font-bold text-slate-500 uppercase h-8 text-right">New Gain</TableHead>
                          <TableHead className="text-[9px] font-bold text-slate-500 uppercase h-8 text-right">Est. Tax</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.scenario_rows.map((row) => (
                          <TableRow key={row.label} className="border-white/10 hover:bg-white/5">
                            <TableCell className="font-bold text-blue-400 text-[10px] italic py-2.5">{row.label}</TableCell>
                            <TableCell className="text-right text-slate-300 font-mono text-[10px] py-2.5">₹{row.gain.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-rose-400 font-mono font-bold text-[10px] py-2.5">₹{row.total_tax.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>

                  {/* 5. Planner */}
                  <Card className="bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden">
                    <div className="bg-black/20 py-3 px-6 border-b border-white/10 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Holding Period Planner</span>
                    </div>
                    <div className="divide-y divide-white/10">
                      <div className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                        <div>
                          <LabelHelp label="Earliest LTCG Date" help="Date asset becomes Long Term." />
                          <span className="text-sm font-mono font-bold text-white tracking-widest">{result.earliest_ltcg_date || "N/A"}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="p-4 flex justify-between items-center bg-emerald-500/10">
                        <div>
                          <LabelHelp label="Estimated Tax Saving" help="Tax saved if you wait until LTCG date." />
                          <span className="text-lg font-mono font-bold text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            ₹{(result.tax_saving_if_wait ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}