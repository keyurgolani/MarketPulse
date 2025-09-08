import { useState, useEffect } from 'react';

/**
 * Hook that debounces a value
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return (): void => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook that provides debounced search functionality
 * @param initialValue - Initial search value
 * @param delay - Debounce delay in milliseconds
 * @returns Object with search value, debounced value, and setter
 */
export const useDebouncedSearch = (
  initialValue: string = '',
  delay: number = 300
): {
  searchValue: string;
  debouncedSearchValue: string;
  setSearchValue: (value: string) => void;
  isSearching: boolean;
} => {
  const [searchValue, setSearchValue] = useState(initialValue);
  const debouncedSearchValue = useDebounce(searchValue, delay);
  const isSearching = searchValue !== debouncedSearchValue;

  return {
    searchValue,
    debouncedSearchValue,
    setSearchValue,
    isSearching,
  };
};
