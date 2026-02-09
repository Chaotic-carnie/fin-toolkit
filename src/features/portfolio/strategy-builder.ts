import { PortfolioLeg } from "./schema";
import { v4 as uuidv4 } from 'uuid';

export type StrategyType = "single" | "straddle" | "strangle" | "iron_condor" | "vertical_spread" | "butterfly" | "calendar";
export type MarketView = "neutral" | "bullish" | "bearish" | "volatile";

export interface StrategyParams {
  asset: string;
  spot: number;
  vol: number;
  expiry: number;
  rate: number;
  quantity: number;
  view?: MarketView;
}

// Helper: Smart rounding for strikes based on price magnitude
const roundStrike = (val: number): number => {
  let step = 0.5;
  if (val > 1000) step = 100;      // Crypto/Indices
  else if (val > 200) step = 10;   // High priced stocks
  else if (val > 50) step = 2.5;   // Mid priced stocks
  else if (val > 10) step = 1;     // Low priced stocks
  
  return Math.round(val / step) * step;
};

export const buildStrategy = (type: StrategyType, params: StrategyParams): PortfolioLeg[] => {
  const { spot, vol, expiry, rate, quantity, asset } = params;
  
  // 1. Calculate Expected Move (1 Standard Deviation)
  // Move = Spot * Vol * sqrt(Time)
  const stdDev = spot * vol * Math.sqrt(expiry);
  
  // Base Strikes
  const atm = roundStrike(spot);
  const otm_1sd_up = roundStrike(spot + stdDev);
  const otm_1sd_down = roundStrike(spot - stdDev);
  const otm_2sd_up = roundStrike(spot + (2 * stdDev));
  const otm_2sd_down = roundStrike(spot - (2 * stdDev));

  const common = {
    asset,
    spot,
    time_to_expiry: expiry,
    vol,
    risk_free_rate: rate,
  };

  const legs: PortfolioLeg[] = [];
  const groupId = uuidv4();

  // Helper to DRY up leg creation
  const addLeg = (name: string, qty: number, strike: number, type: "call" | "put", expiryOverride?: number) => {
    legs.push({
      id: uuidv4(), 
      groupId, 
      name, 
      instrument: "vanilla", 
      method: "black_scholes", 
      quantity: qty, 
      active: true,
      params: { 
          ...common, 
          strike, 
          option_type: type, 
          time_to_expiry: expiryOverride ?? expiry 
      }
    });
  };

  switch (type) {
    case "single":
        // Default to a simple Long Call ATM
        addLeg("Long Call", quantity, atm, "call");
        break;

    case "straddle":
        // Neutral / Long Vol: Buy ATM Call + Buy ATM Put
        addLeg("Straddle Call", quantity, atm, "call");
        addLeg("Straddle Put", quantity, atm, "put");
        break;

    case "strangle":
        // Neutral / Long Vol: Buy OTM Call + Buy OTM Put
        addLeg("Strangle Call", quantity, otm_1sd_up, "call");
        addLeg("Strangle Put", quantity, otm_1sd_down, "put");
        break;

    case "iron_condor":
        // Neutral / Short Vol: Sell Inner Wings (1SD), Buy Outer Wings (2SD)
        // Body (Short Strangle)
        addLeg("Short Call (Inner)", -quantity, otm_1sd_up, "call");
        addLeg("Short Put (Inner)", -quantity, otm_1sd_down, "put");
        // Wings (Protection)
        addLeg("Long Call (Outer)", quantity, otm_2sd_up, "call");
        addLeg("Long Put (Outer)", quantity, otm_2sd_down, "put");
        break;

    case "vertical_spread":
        // Directional: Buy ATM, Sell OTM
        // Default to Bull Call Spread if view is missing or bullish
        const isBullish = !params.view || params.view === "bullish";
        if (isBullish) {
            addLeg("Long Call (ATM)", quantity, atm, "call");
            addLeg("Short Call (OTM)", -quantity, otm_1sd_up, "call");
        } else {
            addLeg("Long Put (ATM)", quantity, atm, "put");
            addLeg("Short Put (OTM)", -quantity, otm_1sd_down, "put");
        }
        break;

    case "butterfly":
        // Long Call Butterfly (1-2-1) centered at ATM
        // Profit if price stays exactly at ATM
        addLeg("Long Call (Low)", quantity, otm_1sd_down, "call");
        addLeg("Short Call (Center)", -2 * quantity, atm, "call");
        addLeg("Long Call (High)", quantity, otm_1sd_up, "call");
        break;

    case "calendar":
        // Long Calendar Spread: Sell Near-term, Buy Long-term
        // Bet on Theta decay of the near term option
        // We assume Long Term is +30 days for the template
        const longExpiry = expiry + (30/365); 
        addLeg("Short Call (Near)", -quantity, atm, "call");
        addLeg("Long Call (Far)", quantity, atm, "call", longExpiry);
        break;
  }

  return legs;
};