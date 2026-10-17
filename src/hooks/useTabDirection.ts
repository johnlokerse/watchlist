import { useState } from 'react';

/** Tracks the travel direction between tab changes. */
export function useTabDirection<T extends string>(tabs: ReadonlyArray<{ id: T }>, value: T) {
  const [state, setState] = useState({ value, direction: 1 });
  if (state.value !== value) {
    const from = tabs.findIndex((t) => t.id === state.value);
    const to = tabs.findIndex((t) => t.id === value);
    setState({ value, direction: to >= from ? 1 : -1 });
  }
  return state.direction;
}
