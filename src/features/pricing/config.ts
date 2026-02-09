// src/features/pricing/config.ts

export const PRICER_CATALOG = {
  market_params: [
    { key: "S", label: "Spot", type: "number", default: 100.0, step: 0.1 },
    { key: "r", label: "Rate (cc)", type: "number", default: 0.05, step: 0.001 },
    { key: "q", label: "Div Yield (cc)", type: "number", default: 0.0, step: 0.001 },
    { key: "sigma", label: "Vol", type: "number", default: 0.2, step: 0.01 },
  ],
  instruments: [
    {
      key: "vanilla",
      label: "Vanilla option",
      base_params: [
        { key: "type", label: "Type", type: "select", default: "call", options: [{ value: "call", label: "Call" }, { value: "put", label: "Put" }] },
        { key: "K", label: "Strike", type: "number", default: 100.0, step: 0.5 },
        { key: "T", label: "T (years)", type: "number", default: 1.0, step: 0.1 },
      ],
      methods: [
        { key: "black_scholes", label: "Closed form (Black–Scholes)", note: "Analytical price + Greeks under lognormal diffusion.", extra_params: [] },
        { key: "binomial_crr", label: "Binomial tree (CRR)", note: "Recombining CRR lattice. Good for American/boundary checks.", extra_params: [{ key: "steps", label: "Tree steps", type: "number", default: 200, step: 10 }] },
      ],
    },
    {
      key: "american",
      label: "American option",
      base_params: [
        { key: "type", label: "Type", type: "select", default: "put", options: [{ value: "call", label: "Call" }, { value: "put", label: "Put" }] },
        { key: "K", label: "Strike", type: "number", default: 100.0, step: 0.5 },
        { key: "T", label: "T (years)", type: "number", default: 1.0, step: 0.1 },
      ],
      methods: [
        { key: "binomial_crr", label: "Binomial tree (CRR)", note: "Lattice model checking early exercise at every node.", extra_params: [{ key: "steps", label: "Tree steps", type: "number", default: 200, step: 10 }] },
      ],
    },
    {
      key: "digital",
      label: "Digital (cash-or-nothing)",
      base_params: [
        { key: "type", label: "Type", type: "select", default: "call", options: [{ value: "call", label: "Call" }, { value: "put", label: "Put" }] },
        { key: "K", label: "Strike", type: "number", default: 100.0, step: 0.5 },
        { key: "payout", label: "Cash Payout", type: "number", default: 1.0, step: 0.1 },
        { key: "T", label: "T (years)", type: "number", default: 1.0, step: 0.1 },
      ],
      methods: [
        { key: "black_scholes", label: "Closed form (Black–Scholes)", note: "Pays fixed amount if ITM. Discontinuous delta.", extra_params: [] },
      ],
    },
    {
      key: "barrier",
      label: "Barrier (knock-out)",
      base_params: [
        { key: "type", label: "Type", type: "select", default: "call", options: [{ value: "call", label: "Call" }, { value: "put", label: "Put" }] },
        { key: "K", label: "Strike", type: "number", default: 100.0, step: 0.5 },
        { key: "H", label: "Barrier Level", type: "number", default: 120.0, step: 0.5 },
        { key: "barrierType", label: "Barrier", type: "select", default: "up-out", options: [{ value: "up-out", label: "Up-and-Out" }, { value: "down-out", label: "Down-and-Out" }] },
        { key: "T", label: "T (years)", type: "number", default: 1.0, step: 0.1 },
      ],
      methods: [
        { 
          key: "mc_discrete", 
          label: "MC (Discrete Monitor)", 
          note: "Standard Monte Carlo checking barrier at fixed dt.", 
          extra_params: [
            { key: "paths", label: "Paths", type: "number", default: 20000, step: 1000 }, 
            { key: "steps", label: "Steps", type: "number", default: 100, step: 10 },
            { key: "seed", label: "Seed", type: "number", default: 1234, step: 1 }
          ] 
        },
        { 
          key: "mc_bridge", 
          label: "MC (Brownian Bridge)", 
          note: "Corrects bias by estimating max excursion between steps.", 
          extra_params: [
            { key: "paths", label: "Paths", type: "number", default: 20000, step: 1000 }, 
            { key: "steps", label: "Steps", type: "number", default: 100, step: 10 },
            { key: "seed", label: "Seed", type: "number", default: 1234, step: 1 }
          ] 
        },
      ],
    },
    {
      key: "asian",
      label: "Asian option",
      base_params: [
        { key: "type", label: "Type", type: "select", default: "call", options: [{ value: "call", label: "Call" }, { value: "put", label: "Put" }] },
        { key: "K", label: "Strike", type: "number", default: 100.0, step: 0.5 },
        { key: "T", label: "T (years)", type: "number", default: 1.0, step: 0.1 },
      ],
      methods: [
        { key: "geometric_closed", label: "Geometric Avg (Closed)", note: "Closed-form solution using modified volatility.", extra_params: [] },
        { 
          key: "arithmetic_mc", 
          label: "Arithmetic Avg (MC)", 
          note: "Monte Carlo simulation of the arithmetic mean.", 
          extra_params: [
            { key: "paths", label: "Paths", type: "number", default: 20000, step: 1000 }, 
            { key: "fixings", label: "Fixings", type: "number", default: 50, step: 1 },
            { key: "seed", label: "Seed", type: "number", default: 1234, step: 1 }
          ] 
        },
      ],
    },
    {
      key: "forward",
      label: "Forward",
      base_params: [
        { key: "K", label: "Delivery Price", type: "number", default: 100.0, step: 0.5 },
        { key: "T", label: "T (years)", type: "number", default: 1.0, step: 0.1 },
      ],
      methods: [
        { key: "discounted_value", label: "Discounted Value", note: "Simple PV of the forward contract.", extra_params: [] },
      ],
    },
  ],
};