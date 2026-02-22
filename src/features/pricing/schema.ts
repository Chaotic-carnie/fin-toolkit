import { z } from "zod";

// --- 1. Enums (Zod Schemas) ---
export const InstrumentTypeSchema = z.enum(["vanilla", "digital", "barrier", "american", "asian", "forward"]);
export const OptionTypeSchema = z.enum(["call", "put"]);
export const MethodSchema = z.enum([
  "black_scholes", 
  "binomial_crr", 
  "mc_discrete", 
  "mc_bridge", 
  "arithmetic_mc", 
  "geometric_closed", 
  "discounted_value"
]);
export const BarrierTypeSchema = z.enum(["up-in", "up-out", "down-in", "down-out"]);

// --- 2. Market Data Schema ---
export const MarketStateSchema = z.object({
  S: z.number().positive().describe("Spot Price"),
  r: z.number().describe("Risk-Free Rate (decimal, e.g. 0.05)"),
  q: z.number().default(0).describe("Dividend Yield (decimal, e.g. 0.01)"),
  sigma: z.number().positive().describe("Volatility (decimal, e.g. 0.2)"),
});

// --- 3. Instrument Parameters (Polymorphic) ---

// A. Vanilla
export const VanillaParamsSchema = z.object({
  K: z.number().positive(),
  T: z.number().nonnegative(),
  type: OptionTypeSchema,
});

// B. Digital
export const DigitalParamsSchema = z.object({
  K: z.number().positive(),
  T: z.number().nonnegative(),
  type: OptionTypeSchema,
  payout: z.number().positive().default(100),
});

// C. Barrier
export const BarrierParamsSchema = z.object({
  K: z.number().positive(),
  T: z.number().nonnegative(),
  type: OptionTypeSchema,
  H: z.number().positive().describe("Barrier Level"),
  barrierType: BarrierTypeSchema,
  paths: z.number().int().positive().default(20000),
  steps: z.number().int().positive().default(100),
  seed: z.number().int().optional(),
});

// D. American
export const AmericanParamsSchema = z.object({
  K: z.number().positive(),
  T: z.number().nonnegative(),
  type: OptionTypeSchema,
  steps: z.number().int().positive().default(200), // Binomial tree depth
});

// E. Asian
export const AsianParamsSchema = z.object({
  K: z.number().positive(),
  T: z.number().nonnegative(),
  type: OptionTypeSchema,
  fixings: z.number().int().positive().optional(),
  paths: z.number().int().positive().default(20000),
  seed: z.number().int().optional(),
});

// F. Forward
export const ForwardParamsSchema = z.object({
  K: z.number().positive().describe("Delivery Price"),
  T: z.number().nonnegative(),
});

// --- 4. Union of all Params ---
export const PricingParamsSchema = z.union([
  VanillaParamsSchema,
  DigitalParamsSchema,
  BarrierParamsSchema,
  AmericanParamsSchema,
  AsianParamsSchema,
  ForwardParamsSchema
]);

// --- 5. Main Request Schema ---
export const PricingRequestSchema = z.object({
  market: MarketStateSchema,
  instrument: InstrumentTypeSchema,
  method: MethodSchema,
  params: PricingParamsSchema,
});

// --- 6. Response Schema ---
export const GreeksSchema = z.object({
  delta: z.number(),
  gamma: z.number(),
  vega: z.number(),
  theta: z.number(),
  rho: z.number(),
});

export const PricingResultSchema = z.object({
  price: z.number(),
  greeks: GreeksSchema,
  latency: z.number().optional(), // ms
});

// --- 7. Type Exports (Inferred) ---
export type InstrumentType = z.infer<typeof InstrumentTypeSchema>;
export type Method = z.infer<typeof MethodSchema>;
export type PricingRequest = z.infer<typeof PricingRequestSchema>;
export type PricingResult = z.infer<typeof PricingResultSchema>;
export type Greeks = z.infer<typeof GreeksSchema>;