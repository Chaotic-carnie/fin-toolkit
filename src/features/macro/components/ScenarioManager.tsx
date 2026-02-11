"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Trash2, Play, Loader2, FolderOpen } from "lucide-react";
import { useMacroStore } from "../store";
import { saveScenario, getScenarios, deleteScenario } from "@/app/macro/actions";
import { toast } from "sonner";
import type { MacroScenario } from "@prisma/client";

// Helper type for what we expect inside the JSON
type ShockState = {
  shortRateBps: number;
  longRateBps: number;
  fxShockPct: number;
  horizonDays: number;
};

export function ScenarioManager() {
  const { shocks, setShocks } = useMacroStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [savedScenarios, setSavedScenarios] = useState<MacroScenario[]>([]);
  const [loading, setLoading] = useState(false);

  // Load scenarios when dialog opens
  useEffect(() => {
    if (open) {
      loadList();
    }
  }, [open]);

  const loadList = async () => {
    const res = await getScenarios();
    if (res.success && res.scenarios) {
      setSavedScenarios(res.scenarios);
    }
  };

  const handleSave = async () => {
    if (!name) return;
    setLoading(true);
    // Pass the raw 'shocks' object to be saved as JSON
    const res = await saveScenario(name, shocks);
    setLoading(false);
    
    if (res.success) {
      toast.success("Scenario Saved");
      setName("");
      loadList();
    } else {
      toast.error("Failed to save");
    }
  };

  const handleLoad = (s: MacroScenario) => {
    // Cast the JSON back to our state type
    const data = s.shocks as unknown as ShockState;
    
    if (data && typeof data.shortRateBps === 'number') {
        setShocks(data);
        toast.success(`Loaded "${s.name}"`);
        setOpen(false);
    } else {
        toast.error("Corrupt scenario data");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteScenario(id);
    loadList();
  };

  // Helper to safely render summary from JSON
  const renderSummary = (json: any) => {
    const s = json as ShockState;
    if (!s) return "Invalid Data";
    return `Rates: ${s.longRateBps > 0 ? '+' : ''}${s.longRateBps}bps • FX: ${s.fxShockPct}%`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white" title="Manage Scenarios">
          <FolderOpen size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scenario Library</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* SAVE SECTION */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Save Current View</Label>
            <div className="flex gap-2">
              <Input 
                placeholder="e.g. Stagflation 2026" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-emerald-500/50"
              />
              <Button onClick={handleSave} disabled={loading || !name} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="h-px bg-slate-800" />

          {/* LOAD SECTION */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saved Scenarios</Label>
            <div className="max-h-[200px] overflow-y-auto dark-scrollbar space-y-2 pr-2">
              {savedScenarios.length === 0 && (
                <div className="text-sm text-slate-600 italic text-center py-4">No saved scenarios yet.</div>
              )}
              {savedScenarios.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => handleLoad(s)}
                  className="group flex items-center justify-between p-3 rounded-md border border-slate-800 bg-slate-950/50 hover:bg-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                >
                  <div className="overflow-hidden">
                    <div className="font-medium text-sm text-slate-300 group-hover:text-white truncate">{s.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1 truncate">
                        {renderSummary(s.shocks)}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10">
                        <Play size={12} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10" onClick={(e) => handleDelete(s.id, e)}>
                        <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}