"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Trash2, Plus, DollarSign, Sparkles } from "lucide-react";
import { addPosition, deletePosition } from "@/app/macro/portfolio-actions"; 
import { toast } from "sonner";

export function PortfolioManager({ positions = [] }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Multi-Asset Form State
  const [name, setName] = useState("");
  const [type, setType] = useState<"BOND" | "FX" | "EQUITY" | "CREDIT" | "OPTION">("BOND");
  const [bucket, setBucket] = useState<"3m" | "2y" | "5y" | "10y">("10y");
  const [amount, setAmount] = useState("");
  
  const [duration, setDuration] = useState("");
  const [convexity, setConvexity] = useState(""); 
  const [beta, setBeta] = useState("");
  const [spreadDuration, setSpreadDuration] = useState("");
  const [delta, setDelta] = useState("");
  const [gamma, setGamma] = useState("");
  const [vega, setVega] = useState("");

  // --- RESTORED AUTOFILL FUNCTIONS ---
  const prefillBond = () => {
    setName("7.18% GS 2033"); setType("BOND"); setBucket("10y");
    setAmount("50000000"); setDuration("6.8"); setConvexity("0.65");
    toast.info("Sample bond loaded.");
  };

  const prefillOption = () => {
    setName("Nifty 50 Straddle"); setType("OPTION"); 
    setAmount("1000000"); setDelta("0"); setGamma("0.02"); setVega("15000");
    toast.info("Sample option loaded.");
  };

  const handleAdd = async () => {
    if (!name || !amount) {
        toast.error("Please fill required fields");
        return;
    }
    setLoading(true);
    const res = await addPosition({
        name, type, bucket, amount: parseFloat(amount),
        duration: parseFloat(duration) || 0,
        convexity: parseFloat(convexity) || 0,
        beta: parseFloat(beta) || 1,
        spreadDuration: parseFloat(spreadDuration) || 0,
        delta: parseFloat(delta) || 0,
        gamma: parseFloat(gamma) || 0,
        vega: parseFloat(vega) || 0,
    });
    setLoading(false);

    if (res.success) {
        toast.success("Position Added");
        // Reset form
        setName(""); setAmount(""); setDuration(""); setConvexity(""); 
        setBeta(""); setSpreadDuration(""); setDelta(""); setGamma(""); setVega("");
    } else {
        toast.error("Failed to add position");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="bg-slate-900 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 h-9">
          <Wallet className="mr-2 h-4 w-4" /> Manage Book
        </Button>
      </SheetTrigger>
      
      <SheetContent className="bg-slate-950 border-l border-slate-800 text-slate-200 w-[400px] sm:w-[540px] overflow-y-auto dark-scrollbar z-[200] pt-12 px-6 pb-32">
        <SheetHeader className="mb-6">
             <SheetTitle className="text-emerald-400 text-2xl font-bold tracking-tight">Portfolio Blotter</SheetTitle>
             <SheetDescription className="text-slate-400 text-sm">
                Add cross-asset positions to stress test in the macro engine.
             </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/60 shadow-inner space-y-5">
            
            {/* AUTFOFILL BUTTONS RESTORED */}
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Plus size={16} className="text-emerald-500"/> New Position
                <div className="ml-auto flex items-center gap-3">
                    <Button variant="link" onClick={prefillBond} className="h-auto p-0 text-emerald-400 text-xs hover:text-emerald-300">
                        <Sparkles className="w-3 h-3 mr-1" /> Bond
                    </Button>
                    <span className="text-slate-700">|</span>
                    <Button variant="link" onClick={prefillOption} className="h-auto p-0 text-pink-400 text-xs hover:text-pink-300">
                        <Sparkles className="w-3 h-3 mr-1" /> Option
                    </Button>
                </div>
            </h4>
            
            <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase">Instrument Name</Label>
                    <Input placeholder="e.g. SPY ETF" className="bg-slate-950 border-slate-800" value={name} onChange={e => setName(e.target.value)} />
                </div>
                
                <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase">Asset Class</Label>
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                        <SelectTrigger className="w-full bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="BOND">Sovereign Bond</SelectItem>
                            <SelectItem value="CREDIT">Corporate Credit</SelectItem>
                            <SelectItem value="EQUITY">Equity (Index/ETF)</SelectItem>
                            <SelectItem value="FX">FX Position</SelectItem>
                            <SelectItem value="OPTION">Derivatives / Options</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* FIX: Removed type="number", added inputMode="decimal" to fix React input wipe bug */}
                <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 uppercase">Notional (Value)</Label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <Input type="text" inputMode="decimal" className="pl-9 bg-slate-950 border-slate-800" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                </div>

                {(type === "BOND" || type === "CREDIT") && (
                    <>
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-500 uppercase">Curve Tenor</Label>
                        <Select value={bucket} onValueChange={(v: any) => setBucket(v)}>
                            <SelectTrigger className="w-full bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700">
                                <SelectItem value="3m">3 Months</SelectItem>
                                <SelectItem value="2y">2 Years</SelectItem>
                                <SelectItem value="5y">5 Years</SelectItem>
                                <SelectItem value="10y">10+ Years</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-500 uppercase">Mod Duration</Label>
                        <Input type="text" inputMode="decimal" className="bg-slate-950 border-slate-800" value={duration} onChange={e => setDuration(e.target.value)} />
                    </div>
                    </>
                )}

                {type === "BOND" && (
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-500 uppercase">Convexity</Label>
                        <Input type="text" inputMode="decimal" className="bg-slate-950 border-slate-800" value={convexity} onChange={e => setConvexity(e.target.value)} />
                    </div>
                )}

                {type === "CREDIT" && (
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-500 uppercase">Spread Duration</Label>
                        <Input type="text" inputMode="decimal" className="bg-slate-950 border-slate-800" value={spreadDuration} onChange={e => setSpreadDuration(e.target.value)} />
                    </div>
                )}

                {type === "EQUITY" && (
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-500 uppercase">Market Beta</Label>
                        <Input type="text" inputMode="decimal" placeholder="1.0" className="bg-slate-950 border-slate-800" value={beta} onChange={e => setBeta(e.target.value)} />
                    </div>
                )}

                {type === "OPTION" && (
                    <>
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-500 uppercase">Delta</Label>
                        <Input type="text" inputMode="decimal" className="bg-slate-950 border-slate-800" value={delta} onChange={e => setDelta(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-500 uppercase">Gamma</Label>
                        <Input type="text" inputMode="decimal" className="bg-slate-950 border-slate-800" value={gamma} onChange={e => setGamma(e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label className="text-xs font-medium text-slate-500 uppercase">Vega (PnL per 1pt Vol)</Label>
                        <Input type="text" inputMode="decimal" className="bg-slate-950 border-slate-800" value={vega} onChange={e => setVega(e.target.value)} />
                    </div>
                    </>
                )}
            </div>
            
            <Button onClick={handleAdd} disabled={loading} className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white">
                {loading ? "Adding..." : "Add to Book"}
            </Button>
          </div>

          <div className="space-y-4">
             <h4 className="text-sm font-semibold text-slate-300">Live Positions</h4>
             <div className="space-y-2 pr-2">
                {positions.map((pos: any) => (
                    <div key={pos.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className={`w-1 h-8 rounded-full ${pos.type === 'EQUITY' ? 'bg-purple-500' : pos.type === 'CREDIT' ? 'bg-orange-500' : pos.type === 'OPTION' ? 'bg-pink-500' : 'bg-emerald-500'}`} />
                            <div>
                                <div className="font-medium text-sm text-slate-200">{pos.name} <span className="text-[10px] text-slate-500 uppercase ml-1 border border-slate-700 px-1 rounded">{pos.type}</span></div>
                                <div className="text-[10px] text-slate-500 flex gap-2 mt-0.5">
                                    <span className="text-slate-400 font-mono">{new Intl.NumberFormat('en-IN', { notation: "compact", maximumFractionDigits: 1 }).format(Number(pos.amount))}</span>
                                </div>
                            </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600 hover:text-rose-400" onClick={() => deletePosition(pos.id)}>
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