"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

// --- The Hijacker Component ---
// This runs only when type="number" is passed. It handles the annoying "snap to 0" 
// React bug by maintaining a local string state until you finish typing.
const SmartNumberInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, value, onChange, onBlur, ...props }, ref) => {
    const [local, setLocal] = React.useState(value !== undefined ? String(value) : "");
    const [isFocused, setIsFocused] = React.useState(false);

    // Sync from parent when you aren't typing
    React.useEffect(() => {
      if (!isFocused && value !== undefined) {
        setLocal(String(value));
      }
    }, [value, isFocused]);

    return (
      <input
        {...props}
        type="text" // Secretly use text so it allows "-" and ""
        inputMode="decimal"
        ref={ref}
        value={local}
        onFocus={(e) => {
          setIsFocused(true);
          if (props.onFocus) props.onFocus(e);
        }}
        onChange={(e) => {
          const val = e.target.value;
          
          // Strictly allow only numbers, decimals, and minus signs
          if (/^-?\d*\.?\d*$/.test(val)) {
            setLocal(val);
            
            // Only update the rest of your app if it's a fully formed number.
            // If it's just a "-" or ".", hold it locally.
            if (val !== "" && val !== "-" && val !== "." && val !== "-.") {
              if (onChange) onChange(e);
            }
          }
        }}
        onBlur={(e) => {
          setIsFocused(false);
          // If you left the box empty or broken, force it to 0 so your app doesn't crash on NaN
          if (local === "" || local === "-" || local === "." || local === "-.") {
            setLocal("0");
            if (onChange) {
              // Fake an event payload to update your parent state to 0
              onChange({
                ...e,
                target: { ...e.target, value: "0" },
                currentTarget: { ...e.currentTarget, value: "0" },
              } as React.ChangeEvent<HTMLInputElement>);
            }
          } else {
            // Clean up formatting (e.g. "1." becomes "1")
            setLocal(String(Number(local)));
          }
          if (onBlur) onBlur(e);
        }}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
    );
  }
);
SmartNumberInput.displayName = "SmartNumberInput";

// --- The Standard Input Component ---
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    
    // Intercept all number inputs!
    if (type === "number") {
      return <SmartNumberInput className={className} {...props} ref={ref} />;
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };