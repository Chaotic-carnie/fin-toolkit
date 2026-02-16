"use client";

// Helper to safely access sessionStorage (prevents SSR hydration crashes)
const getStorage = (key: string) => {
  if (typeof window === "undefined") return [];
  const data = sessionStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setStorage = (key: string, data: any) => {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(key, JSON.stringify(data));
  }
};

// ==========================================
// 1. MACRO SCENARIOS (Session Storage)
// ==========================================

export async function getScenarios() {
  const scenarios = getStorage("demo_scenarios");
  // Sort by newest first to mimic DB behavior
  scenarios.sort((a: any, b: any) => b.createdAt - a.createdAt);
  return { success: true, scenarios };
}

export async function saveScenario(name: string, shocks: any) {
  const scenarios = getStorage("demo_scenarios");
  const newScenario = {
    id: crypto.randomUUID(),
    name,
    shocks,
    createdAt: Date.now(),
  };
  
  setStorage("demo_scenarios", [...scenarios, newScenario]);
  return { success: true };
}

export async function deleteScenario(id: string) {
  const scenarios = getStorage("demo_scenarios");
  const filtered = scenarios.filter((s: any) => s.id !== id);
  setStorage("demo_scenarios", filtered);
  return { success: true };
}

// ==========================================
// 2. PORTFOLIO POSITIONS (Session Storage)
// ==========================================

export async function getPortfolio() {
  const positions = getStorage("demo_portfolio");
  positions.sort((a: any, b: any) => b.createdAt - a.createdAt);
  return { success: true, positions };
}

export async function addPosition(data: {
  name: string;
  type: "BOND" | "FX";
  bucket: "short" | "long";
  duration: number;
  amount: number;
}) {
  const positions = getStorage("demo_portfolio");
  const newPosition = {
    ...data,
    id: crypto.randomUUID(),
    convexity: 0,
    createdAt: Date.now(),
  };

  setStorage("demo_portfolio", [...positions, newPosition]);
  return { success: true };
}

export async function deletePosition(id: string) {
  const positions = getStorage("demo_portfolio");
  const filtered = positions.filter((p: any) => p.id !== id);
  setStorage("demo_portfolio", filtered);
  return { success: true };
}
