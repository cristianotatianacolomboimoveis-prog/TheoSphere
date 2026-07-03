import { useState, useEffect } from "react";

/**
 * Hook utilitario para debounce de valores.
 * Evita chamadas excessivas ao backend durante digitacao.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
