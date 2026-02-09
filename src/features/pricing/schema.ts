import { z } from "zod";

// --- Base Building Blocks ---
const MarketSchema = z.object({
  S: z.number().describe("Spot Price"),
  r: z.number().describe("Risk-free Rate (decimal, e.g., 0.05)"),
  q: z.number().default(0).describe("Dividend Yield (decimal, e.g., 0.0)"),
  sigma: z.number().describe("Volatility (decimal, e.g., 0.2)"),
});

const BaseOptionParams = z.object({
  K: z.number().describe("Strike Price"),
  T: z.number().describe("Time to Expiry (years)"),
  type: z.enum(["call", "put"]).describe("Option Type"),
});

const MethodParams = z.object({
  steps: z.number().optional().describe("Steps for Binomial/MC methods"),
  paths: z.number().optional().describe("Simulation paths for Monte Carlo"),
  seed: z.number().optional().describe("Seed for deterministic RNG"),
});

// --- Instrument Specific Schemas ---

const VanillaSchema = z.object({
  instrument: z.literal("vanilla"),
  method: z.enum(["black_scholes", "binomial_crr"]),
  params: BaseOptionParams.merge(MethodParams), // Vanilla needs K, T, Type + Steps (if binomial)
});

const AmericanSchema = z.object({
  instrument: z.literal("american"),
  method: z.enum(["binomial_crr"]), // American only supports Tree
  params: BaseOptionParams.merge(MethodParams),
});

const DigitalSchema = z.object({
  instrument: z.literal("digital"),
  method: z.literal("black_scholes"),
  params: BaseOptionParams.extend({
    payout: z.number().describe("Cash payout amount"),
  }),
});

const BarrierSchema = z.object({
  instrument: z.literal("barrier"),
  method: z.enum(["mc_discrete", "mc_bridge"]),
  params: BaseOptionParams.merge(MethodParams).extend({
    H: z.number().describe("Barrier Level"),
    barrierType: z.enum(["up-in", "up-out", "down-in", "down-out"]),
  }),
});

const AsianSchema = z.object({
  instrument: z.literal("asian"),
  method: z.enum(["geometric_closed", "arithmetic_mc"]),
  params: BaseOptionParams.merge(MethodParams).extend({
    fixings: z.number().optional().describe("Number of observation points (for Arithmetic MC)"),
  }),
});

const ForwardSchema = z.object({
  instrument: z.literal("forward"),
  method: z.literal("discounted_value"),
  params: z.object({
    K: z.number().describe("Delivery Price"),
    T: z.number().describe("Time to Expiry (years)"),
  }),
});

// --- The Master Union ---
export const PricingRequestSchema = z.object({
  market: MarketSchema,
  // The 'discriminated union' automatically validates based on 'instrument'
}).and(
  z.discriminatedUnion("instrument", [
    VanillaSchema,
    AmericanSchema,
    DigitalSchema,
    BarrierSchema,
    AsianSchema,
    ForwardSchema,
  ])
);

export type PricingRequest = z.infer<typeof PricingRequestSchema>;