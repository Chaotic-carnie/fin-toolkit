"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EconomicEvent } from "@prisma/client";

interface Props {
  events: EconomicEvent[];
  onEventClick: (event: EconomicEvent) => void;
}

export function EconomicCalendar({ events, onEventClick }: Props) {
  // Sort by date (nearest first)
  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sortedEvents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-xs italic">
        No events scheduled for this period.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto dark-scrollbar pr-2 space-y-2">
      {sortedEvents.map((ev) => {
        const date = new Date(ev.date);
        const isHighImpact = ev.impact === "HIGH";
        
        return (
          <div 
            key={ev.id}
            onClick={() => onEventClick(ev)}
            className="flex items-center justify-between p-3 rounded bg-slate-950/50 border border-slate-800 hover:border-slate-600 hover:bg-slate-900 cursor-pointer group transition-all"
          >
            {/* Date Box */}
            <div className="flex flex-col items-center justify-center w-10 shrink-0 border-r border-slate-800 pr-3 mr-3">
              <span className="text-[10px] uppercase font-bold text-slate-500">{format(date, "MMM")}</span>
              <span className="text-lg font-bold text-slate-200 leading-none">{format(date, "dd")}</span>
            </div>

            {/* Event Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-slate-200 truncate group-hover:text-blue-300 transition-colors">
                  {ev.event}
                </span>
                {isHighImpact && (
                  <Badge variant="destructive" className="h-4 px-1 text-[9px] uppercase tracking-wider">High</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                <span>Act: <span className="text-slate-300">{ev.actual || "--"}</span></span>
                <span className="w-px h-3 bg-slate-700" />
                <span>Est: <span className="text-slate-300">{ev.consensus || "--"}</span></span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}