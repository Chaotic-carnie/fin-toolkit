import { z } from "zod";
import { InstrumentTypeSchema, MethodSchema, PricingParamsSchema } from "@/features/pricing/schema";

// --- 1. The Building Block: A Trade/Leg ---
export const PortfolioLegSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  
  // The "Priceable" core
  instrument: InstrumentTypeSchema,
  method: MethodSchema,
  params: PricingParamsSchema, 
  
  // Portfolio Settings
  quantity: z.number().default(1),
  active: z.boolean().default(true), // Included in calculation?
  
  // "Strategy Awareness" (For the future AI)
  groupId: z.string().optional(), // Links legs together (e.g. Iron Condor)
  strategyType: z.string().optional(), // e.g., "vertical_spread"
});

// --- 2. The Group/Strategy Wrapper ---
// This allows us to treat a "Spread" as one object in the UI
export const StrategyGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(), // e.g. "Hedge for Q3"
  strategyType: z.string().optional(), // "straddle", "iron_condor"
  legs: z.array(z.string()), // Array of Leg IDs
});

// --- 3. The Master State (This goes into DB 'portfolioJson') ---
export const PortfolioStateSchema = z.object({
  trades: z.array(PortfolioLegSchema),
  groups: z.array(StrategyGroupSchema).default([]),
  
  // Metadata for the environment when this was saved
  settings: z.object({
    baseCurrency: z.string().default("USD"),
    globalVolShock: z.number().default(0), // "What if Vol +5%?"
    globalSpotShock: z.number().default(0), // "What if Spot -10%?"
  }).default({}),
});

export type PortfolioState = z.infer<typeof PortfolioStateSchema>;