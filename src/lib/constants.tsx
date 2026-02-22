import { 
  Calculator, Landmark, LineChart, Briefcase, 
  Search, RefreshCw, Database, TrendingUp, ShieldAlert
} from "lucide-react";

export const FEATURE_GROUPS = [
  {
    category: "Core Analytics",
    features: [
      { id: 'pricer', title: "Instrument Pricer", desc: "Black-Scholes & Exotics", href: "/pricer", icon: <LineChart />, size: "large" },
      { id: 'strategy', title: "Strategy Builder", desc: "Structure Discovery", href: "/strategy", icon: <Search />, size: "small" },
      { id: 'scenario', title: "Scenario Engine", desc: "Shock & Vol Analysis", href: "/scenario", icon: <RefreshCw />, size: "small" },
    ]
  },
  {
    category: "Portfolio & Macro",
    features: [
      { id: 'portfolio', title: "Portfolio Analytics", desc: "Real-time Risk Matrix", href: "/portfolio", icon: <Briefcase />, size: "medium" },
      { id: 'macro', title: "Macro Explorer", desc: "Rates & FX Scenarios", href: "/macro", icon: <TrendingUp />, size: "medium" },
    ]
  },
  {
    category: "Capital & Tax",
    features: [
      { id: 'capital', title: "Capital Suite", desc: "Margins, Sizing & NPV", href: "/capital/budgeting", icon: <ShieldAlert />, size: "small" },
      { id: 'tax', title: "Tax Calculator", desc: "Indian Capital Gains & VDA", href: "/tax", icon: <Landmark />, size: "small" },
    ]
  }
];

export const CORE_FEATURES = [
  { 
    id: 'pricer', 
    title: "Instrument Pricer", 
    desc: "Advanced options and derivatives pricing engine supporting Vanilla, American, Barrier, and Asian classes with real-time Greeks.", 
    href: "/pricer" 
  },
  { 
    id: 'portfolio', 
    title: "Portfolio Analytics", 
    desc: "Real-time risk matrix, interactive payoff charting, and aggregate PnL tracking for complex multi-leg positions.", 
    href: "/portfolio" 
  },
  { 
    id: 'strategy', 
    title: "Strategy Builder", 
    desc: "Quantitative discovery environment for multi-leg structures. Define your market view and constraints to generate optimal candidates.", 
    href: "/strategy" 
  },
  { 
    id: 'macro', 
    title: "Macro Explorer", 
    desc: "Rates and FX stress testing tailored for the Indian context, featuring dynamic economic indicators and portfolio impact grids.", 
    href: "/macro" 
  },
  { 
    id: 'scenario', 
    title: "Scenario Engine", 
    desc: "Apply targeted or global market shock regimes (Spot, Vol, Rates) to stress-test your structures and compare base vs. shocked outputs.", 
    href: "/scenario" 
  },
  { 
    id: 'tax', 
    title: "Tax Calculator", 
    desc: "Comprehensive Indian capital gains and VDA (Crypto) liability estimator with holding period planners and what-if sensitivity analysis.", 
    href: "/tax" 
  },
  { 
    id: 'capital', 
    title: "Capital Suite", 
    desc: "Complete capital management featuring Reg T margins, Kelly criterion position sizing, risk of ruin simulations, and NPV budgeting.", 
    href: "/capital/budgeting" 
  },
];