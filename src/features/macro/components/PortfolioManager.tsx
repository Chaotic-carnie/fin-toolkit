"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Trash2, Plus, TrendingUp, DollarSign, Info, Sparkles } from "lucide-react";
import { addPosition, deletePosition } from "@/app/macro/portfolio-actions";
import { toast } from "sonner";
import type { PortfolioPosition } from "@prisma/client";

interface Props {
  positions: PortfolioPosition[];
}

export function PortfolioManager({ positions = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState<"BOND" | "FX">("BOND");
  const [bucket, setBucket] = useState<"short" | "long">("long");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");

  const handleAdd = async () => {
    if (!name || !amount || !duration) {
        toast.error("Please fill all fields");
        return;
    }

    const amt = parseFloat(amount);
    const dur = parseFloat(duration);

    if (isNaN(amt) || isNaN(dur)) {
        toast.error("Amount and Duration must be valid numbers");
        return;
    }
    
    setLoading(true);
    const res = await addPosition({
        name,
        type,
        bucket,
        amount: amt,
        duration: dur
    });
    setLoading(false);

    if (res.success) {
        toast.success("Position Added");
        // Reset Form
        setName("");
        setAmount("");
        setDuration("");
    } else {
        toast.error("Failed to add position");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deletePosition(id);
    if (res.success) toast.success("Position Removed");
    else toast.error("Failed to delete");
  };

  // Helper to fill valid data instantly
  const prefillSample = () => {
    setName("7.18% GS 2033");
    setType("BOND");
    setBucket("long");
    setAmount("50000000"); // 5 Cr
    setDuration("6.8");
    toast.info("Sample values loaded. Click 'Add' to save.");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="bg-slate-900 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 h-8 text-xs">
          <Wallet className="mr-2 h-3 w-3" />
          Manage Book
        </Button>
      </SheetTrigger>
      
      {/* SHEET CONTENT: Fixed Z-Index, Padding, and Scrollbar */}
      <SheetContent className="bg-slate-950 border-l border-slate-800 text-slate-200 w-[400px] sm:w-[540px] overflow-y-auto dark-scrollbar z-[200] pt-12 px-6">
        <SheetHeader className="mb-6">
          <div className="flex justify-between items-start">
              <div>
                  <SheetTitle className="text-emerald-400 text-2xl font-bold tracking-tight">Portfolio Blotter</SheetTitle>
                  <SheetDescription className="text-slate-400 text-sm">
                    Live risk engine input.
                  </SheetDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowGuide(!showGuide)} className="text-xs text-blue-400 hover:text-blue-300">
                  <Info className="w-3 h-3 mr-1" /> {showGuide ? "Hide Guide" : "Input Guide"}
              </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6">
            
          {/* HELP GUIDE (Collapsible) */}
          {showGuide && (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs space-y-3">
                  <h5 className="font-semibold text-blue-300 flex items-center gap-2">
                      Input Instructions
                      <Button variant="link" onClick={prefillSample} className="h-auto p-0 text-emerald-400 ml-auto font-bold">
                          <Sparkles className="w-3 h-3 mr-1" /> Autofill Sample
                      </Button>
                  </h5>
                  <ul className="space-y-2 text-slate-300 list-disc pl-4">
                      <li>
                          <span className="text-white font-medium">Bond (Rates):</span> Use for Government Securities. 
                          <br/><span className="opacity-70">Ex: Amount = 50000000 (5Cr), Duration = 6.4</span>
                      </li>
                      <li>
                          <span className="text-white font-medium">FX (Currency):</span> Use for USD/INR hedges.
                          <br/><span className="opacity-70">Ex: Amount = 1000000 ($1M), Duration = 1.0</span>
                      </li>
                  </ul>
              </div>
          )}

          {/* ADD TRADE FORM */}
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/60 shadow-inner space-y-5">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Plus size={16} className="text-emerald-500"/> New Position
            </h4>
            
            <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Instrument Name</Label>
                    <Input 
                      placeholder="e.g. 7.26% GS 2033" 
                      className="bg-slate-950 border-slate-800 focus:border-emerald-500/50 text-white placeholder:text-slate-600" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                    />
                </div>
                
                <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Type</Label>
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                        <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-slate-200 text-xs h-10 truncate">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 z-[250]">
                            <SelectItem value="BOND" className="text-xs focus:bg-slate-800 focus:text-white cursor-pointer">Bond (Rates)</SelectItem>
                            <SelectItem value="FX" className="text-xs focus:bg-slate-800 focus:text-white cursor-pointer">FX (Currency)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bucket (Risk)</Label>
                    <Select value={bucket} onValueChange={(v: any) => setBucket(v)}>
                        <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-slate-200 text-xs h-10 truncate">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 z-[250]">
                            <SelectItem value="short" className="text-xs focus:bg-slate-800 focus:text-white cursor-pointer">Short End (3M Rate)</SelectItem>
                            <SelectItem value="long" className="text-xs focus:bg-slate-800 focus:text-white cursor-pointer">Long End (10Y Yield)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</Label>
                    <div className="relative">
                         <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                         <Input 
                            type="number" 
                            placeholder="50000000" 
                            className="pl-9 bg-slate-950 border-slate-800 focus:border-emerald-500/50 text-white placeholder:text-slate-600" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                          />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</Label>
                    <div className="relative">
                         <TrendingUp className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                         <Input 
                            type="number" 
                            placeholder="6.4" 
                            className="pl-9 bg-slate-950 border-slate-800 focus:border-emerald-500/50 text-white placeholder:text-slate-600" 
                            value={duration} 
                            onChange={e => setDuration(e.target.value)} 
                          />
                    </div>
                </div>
            </div>
            
            <Button onClick={handleAdd} disabled={loading} className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
                {loading ? "Adding..." : "Add to Book"}
            </Button>
          </div>

          {/* POSITIONS TABLE */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-300">Live Positions ({positions.length})</h4>
                {/* PREFILL BUTTON FOR EMPTY STATES */}
                {positions.length === 0 && (
                   <Button variant="ghost" size="sm" onClick={prefillSample} className="text-xs text-emerald-400 h-6 hover:text-emerald-300">
                     <Sparkles className="w-3 h-3 mr-1" /> Load Sample
                   </Button>
                )}
             </div>
             
             <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 dark-scrollbar">
                {positions.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-600 border border-dashed border-slate-800 rounded-lg bg-slate-950/30">
                        <Wallet className="h-8 w-8 mb-2 opacity-20" />
                        <span className="text-sm">No positions found.</span>
                        <span className="text-xs opacity-50">Use the guide above to start.</span>
                    </div>
                )}
                
                {positions.map((pos) => (
                    <div key={pos.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 group hover:border-slate-600 transition-all hover:bg-slate-800">
                        <div className="flex items-center gap-3">
                            <div className={`w-1 h-8 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)] ${pos.type === 'BOND' ? 'bg-blue-500 shadow-blue-500/20' : 'bg-emerald-500 shadow-emerald-500/20'}`} />
                            <div>
                                <div className="font-medium text-sm text-slate-200">{pos.name}</div>
                                <div className="text-[10px] text-slate-500 flex gap-2 mt-0.5">
                                    <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{pos.type}</span>
                                    <span className="self-center text-slate-600">•</span>
                                    <span className="text-slate-400 font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(pos.amount)}</span>
                                    <span className="self-center text-slate-600">•</span>
                                    <span className="text-slate-400">Dur: {pos.duration}</span>
                                </div>
                            </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 transition-colors" onClick={() => handleDelete(pos.id)}>
                            <Trash2 size={14} />
                        </Button>
                    </div>
                ))}
             </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}