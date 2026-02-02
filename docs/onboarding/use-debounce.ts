// src/hooks/use-debounce.ts
import { useEffect, useState } from 'react';

/**
 * Debounce a value by delaying its update
 * Useful for search inputs to avoid excessive API calls
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns Debounced value
 * 
 * @example
 * const [query, setQuery] = useState("");
 * const debouncedQuery = useDebounce(query, 500);
 * 
 * useEffect(() => {
 *   // This only fires 500ms after user stops typing
 *   fetchResults(debouncedQuery);
 * }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}