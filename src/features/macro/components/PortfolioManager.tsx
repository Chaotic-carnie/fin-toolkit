"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Trash2, Plus, TrendingUp, DollarSign, Info, Sparkles, Activity } from "lucide-react";
import { addPosition, deletePosition } from "@/app/macro/portfolio-actions"; 
import { toast } from "sonner";
import type { PortfolioPosition } from "@prisma/client";

interface Props {
  positions: PortfolioPosition[];
}

export function PortfolioManager({ positions = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState<"BOND" | "FX">("BOND");
  const [bucket, setBucket] = useState<"short" | "long">("long");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [convexity, setConvexity] = useState(""); // NEW FIELD

  const handleAdd = async () => {
    if (!name || !amount) {
        toast.error("Please fill required fields");
        return;
    }
    const amt = parseFloat(amount);
    const dur = parseFloat(duration) || 0;
    const conv = parseFloat(convexity) || 0; // Default to 0 if empty

    setLoading(true);
    // Ensure 'portfolio-actions.ts' accepts 'convexity'
    const res = await addPosition({
        name,
        type,
        bucket,
        amount: amt,
        duration: dur,
        convexity: conv 
    });
    setLoading(false);

    if (res.success) {
        toast.success("Position Added");
        setName(""); setAmount(""); setDuration(""); setConvexity("");
    } else {
        toast.error("Failed to add");
    }
  };

  const handleDelete = async (id: string) => {
    await deletePosition(id);
    toast.success("Position Removed");
  };

  const prefillSample = () => {
    setName("7.18% GS 2033");
    setType("BOND");
    setBucket("long");
    setAmount("50000000"); 
    setDuration("6.8");
    setConvexity("0.65"); // Sample Convexity
    toast.info("Sample loaded.");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="bg-slate-900 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 h-8 text-xs">
          <Wallet className="mr-2 h-3 w-3" />
          Manage Book
        </Button>
      </SheetTrigger>
      
      <SheetContent className="bg-slate-950 border-l border-slate-800 text-slate-200 w-[400px] sm:w-[540px] overflow-y-auto dark-scrollbar z-[200] pt-12 px-6">
        <SheetHeader className="mb-6">
             <SheetTitle className="text-emerald-400 text-2xl font-bold tracking-tight">Portfolio Blotter</SheetTitle>
             <SheetDescription className="text-slate-400 text-sm">
                Fixed Income uses Duration/Convexity approx. FX uses Spot P&L.
             </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* ADD TRADE FORM */}
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/60 shadow-inner space-y-5">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Plus size={16} className="text-emerald-500"/> New Position
                <Button variant="link" onClick={prefillSample} className="h-auto p-0 text-emerald-400 ml-auto text-xs">
                    <Sparkles className="w-3 h-3 mr-1" /> Autofill
                </Button>
            </h4>
            
            <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase">Instrument Name</Label>
                    <Input placeholder="e.g. 7.26% GS 2033" className="bg-slate-950 border-slate-800" value={name} onChange={e => setName(e.target.value)} />
                </div>
                
                <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase">Type</Label>
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                        <SelectTrigger className="w-full bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="BOND">Fixed Income</SelectItem>
                            <SelectItem value="FX">FX / Derivative</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {type === "BOND" && (
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-500 uppercase">Bucket</Label>
                        <Select value={bucket} onValueChange={(v: any) => setBucket(v)}>
                            <SelectTrigger className="w-full bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700">
                                <SelectItem value="short">Short (3M)</SelectItem>
                                <SelectItem value="long">Long (10Y)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase">Notional ({type === 'BOND' ? 'INR' : 'USD'})</Label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <Input type="number" className="pl-9 bg-slate-950 border-slate-800" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                </div>

                {type === "BOND" && (
                    <>
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-500 uppercase">Mod Duration</Label>
                        <div className="relative">
                            <TrendingUp className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                            <Input type="number" className="pl-9 bg-slate-950 border-slate-800" value={duration} onChange={e => setDuration(e.target.value)} />
                        </div>
                    </div>
                    {/* NEW CONVEXITY INPUT */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-500 uppercase">Convexity</Label>
                        <div className="relative">
                            <Activity className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                            <Input type="number" placeholder="0.50" className="pl-9 bg-slate-950 border-slate-800" value={convexity} onChange={e => setConvexity(e.target.value)} />
                        </div>
                    </div>
                    </>
                )}
            </div>
            
            <Button onClick={handleAdd} disabled={loading} className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white">
                {loading ? "Adding..." : "Add to Book"}
            </Button>
          </div>

          {/* POSITIONS TABLE */}
          <div className="space-y-4">
             <h4 className="text-sm font-semibold text-slate-300">Live Positions</h4>
             <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 dark-scrollbar">
                {positions.map((pos) => (
                    <div key={pos.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className={`w-1 h-8 rounded-full ${pos.type === 'BOND' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                            <div>
                                <div className="font-medium text-sm text-slate-200">{pos.name}</div>
                                <div className="text-[10px] text-slate-500 flex gap-2 mt-0.5">
                                    <span className="text-slate-400 font-mono">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: pos.type === 'BOND' ? 'INR' : 'USD', maximumFractionDigits: 0 }).format(Number(pos.amount))}</span>
                                    {pos.type === 'BOND' && (
                                        <>
                                        <span>• Dur: {Number(pos.duration)}</span>
                                        {/* Display Convexity if available */}
                                        <span>• Conv: {Number(pos.convexity || 0)}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600 hover:text-rose-400" onClick={() => handleDelete(pos.id)}>
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