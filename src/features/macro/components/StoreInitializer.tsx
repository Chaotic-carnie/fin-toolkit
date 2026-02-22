"use client";

import { useRef } from "react";
import { useMacroStore, RawPosition } from "../store";

export function StoreInitializer({ positions }: { positions: RawPosition[] }) {
  const initialized = useRef(false);
  if (!initialized.current) {
    useMacroStore.getState().setPositions(positions);
    initialized.current = true;
  }
  return null;
}