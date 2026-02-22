import { recommendStrategies } from "./engine";

self.addEventListener("message", (event) => {
  try {
    const { market, view, gen, constraints } = event.data;
    
    // Run the heavy math engine synchronously on this background thread
    const candidates = recommendStrategies(market, view, gen, constraints);
    
    // Post the calculated candidates back to the main UI thread
    self.postMessage({ candidates });
  } catch (error: any) {
    self.postMessage({ error: error.message });
  }
});