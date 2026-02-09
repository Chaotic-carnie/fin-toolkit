import { 
  Calculator, Landmark, LineChart, Briefcase, 
  Search, RefreshCw, FileText, Database, TrendingUp 
} from "lucide-react";

export const FEATURE_GROUPS = [
  {
    category: "Core Analytics",
    features: [
      { id: 'pricer', title: "Option Pricer", desc: "Black-Scholes & Greeks", href: "/pricer", icon: <LineChart />, size: "large" },
      { id: 'strategy', title: "Strategy Builder", desc: "Structure Analysis", href: "/strategy", icon: <Search />, size: "small" },
      { id: 'scenario', title: "Scenario Reprice", desc: "Shock & Vol Analysis", href: "/scenario", icon: <RefreshCw />, size: "small" },
    ]
  },
  {
    category: "Portfolio & Macro",
    features: [
      { id: 'portfolio', title: "Portfolio Workbench", desc: "Multi-leg builder", href: "/portfolio", icon: <Briefcase />, size: "medium" },
      { id: 'macro', title: "Macro Explorer", desc: "Rates & FX Scenarios", href: "/macro", icon: <TrendingUp />, size: "medium" },
    ]
  },
  {
    category: "Financial Planning",
    features: [
      { id: 'tax', title: "Indian Tax", desc: "Capital Gains & VDA", href: "/tax", icon: <Landmark />, size: "small" },
      { id: 'capbud', title: "Cap Budgeting", desc: "NPV, IRR & MIRR", href: "/capbud", icon: <Calculator />, size: "small" },
      { id: 'batch', title: "CSV Batch", desc: "Bulk Processing", href: "/batch", icon: <Database />, size: "small" },
      { id: 'runs', title: "Run History", desc: "Audit & Exports", href: "/runs", icon: <FileText />, size: "small" },
    ]
  }
];
export const CORE_FEATURES = [
  { id: 'pricer', title: "Instrument pricer", desc: "Pick an instrument + method, then run inputs → outputs.", href: "/pricer" },
  { id: 'portfolio', title: "Portfolio workbench", desc: "Multi-leg builder, payoff profile, scenario grid, saved portfolios.", href: "/portfolio" },
  { id: 'strategy', title: "Strategy builder", desc: "View → candidate structures → scenario analysis → save as portfolio.", href: "/strategy" },
  { id: 'macro', title: "Macro scenario explorer", desc: "Rates/FX stress testing (India-context indicators) + portfolio P&L grids.", href: "/macro" },
  { id: 'scenario', title: "Scenario reprice", desc: "Apply shocks and compare base vs shocked outputs.", href: "/scenario" },
  { id: 'tax', title: "Tax calculator", desc: "Indian capital gains & VDA estimation + what-if scenarios.", href: "/tax" },
  { id: 'batch', title: "CSV batch", desc: "Upload a CSV and download results.", href: "/batch" },
  { id: 'runs', title: "Run history", desc: "Browse saved runs and download CSV outputs.", href: "/runs" },
];