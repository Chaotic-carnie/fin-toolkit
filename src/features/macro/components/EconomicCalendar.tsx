"use client";

import { Badge } from "@/components/ui/badge";

export type CalendarEvent = {
  id: string;
  date: Date;
  event: string;
  country: string;
  impact: string;
  forecast: string | null;
};

interface Props {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

export function EconomicCalendar({ events = [], onEventClick }: Props) {
  const today = new Date();

  return (
    // FIXED: Switched to standard div with your custom utility class
    <div className="h-full pr-2 overflow-y-auto dark-scrollbar">
      <div className="space-y-3 pb-4">
        {events && events.map((ev) => {
          const isPast = new Date(ev.date) < today;
          const isHigh = ev.impact === "High";
          
          return (
            <div 
              key={ev.id}
              onClick={() => onEventClick?.(ev)}
              className={`
                relative p-3 rounded-lg border text-left transition-all cursor-pointer group
                ${isPast 
                  ? 'opacity-50 border-white/5 bg-slate-900/20' 
                  : 'border-white/10 bg-slate-900/60 hover:border-emerald-500/30 hover:bg-slate-800'
                }
              `}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isPast ? 'text-slate-600' : 'text-slate-500 group-hover:text-slate-400'}`}>
                    {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  {ev.country === 'USA' && <span className="text-[10px] opacity-80">🇺🇸</span>}
                  {ev.country === 'IND' && <span className="text-[10px] opacity-80">🇮🇳</span>}
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-[9px] h-4 ${isHigh ? 'border-rose-500/40 text-rose-400 bg-rose-500/10' : 'border-slate-700 text-slate-400'}`}
                >
                  {ev.impact}
                </Badge>
              </div>

              <div className={`text-sm font-medium ${isPast ? 'text-slate-500' : 'text-slate-200 group-hover:text-white transition-colors'}`}>
                {ev.event}
              </div>

              {ev.forecast && (
                <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${isPast ? 'bg-slate-700' : 'bg-blue-500/50'}`}></span>
                  Forecast: <span className={isPast ? 'text-slate-500' : 'text-slate-300'}>{ev.forecast}</span>
                </div>
              )}
            </div>
          );
        })}
        
        {(!events || events.length === 0) && (
          <div className="text-center text-slate-500 py-10 text-xs">
            No upcoming events found.
          </div>
        )}
      </div>
    </div>
  );
}