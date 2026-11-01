import { useSyncExternalStore } from 'react';
import { readValue, writeValue, subscribeStorage } from '../services/cloudStorage';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const storedValue = useSyncExternalStore(subscribeStorage, () => readValue(key, initialValue));
  return [storedValue, (value) => writeValue(key, value, initialValue)];
}
