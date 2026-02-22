import { z } from "zod";

// --- 1. Human-Readable Params (Matches Frontend & Curl) ---
export const PortfolioParamsSchema = z.object({
  asset: z.string().default("BTC"),
  spot: z.number(),
  strike: z.number().optional(), // Optional because some strategies (like Spot) don't need it
  vol: z.number(),
  time_to_expiry: z.number(),
  risk_free_rate: z.number().default(0.05),
  dividend_yield: z.number().optional().default(0),
  option_type: z.enum(["call", "put"]).optional(),
  
  // Exotics support
  payout: z.number().optional(),
  barrier: z.number().optional(),
  barrier_type: z.enum(["up-in", "up-out", "down-in", "down-out"]).optional(),
});

// --- 2. Portfolio Leg Schema ---
export const PortfolioLegSchema = z.object({
  id: z.string(),
  quantity: z.number(),
  instrument: z.enum(["vanilla", "digital", "barrier"]),
  active: z.boolean().default(true),
  params: PortfolioParamsSchema,
});

// --- 3. Strategy Group Schema ---
export const StrategyGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  strategyType: z.string().optional(),
  legs: z.array(z.string()), // Array of Leg IDs
});

// --- 4. Global State Schema ---
export const PortfolioStateSchema = z.object({
  trades: z.array(PortfolioLegSchema),
  groups: z.array(StrategyGroupSchema),
  settings: z.object({
    baseCurrency: z.string(),
    globalSpotShock: z.number(),
    globalVolShock: z.number(),
  }),
});

// --- Exports ---
export type PortfolioLeg = z.infer<typeof PortfolioLegSchema>;
export type PortfolioState = z.infer<typeof PortfolioStateSchema>;
export type StrategyGroup = z.infer<typeof StrategyGroupSchema>;