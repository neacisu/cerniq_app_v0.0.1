import { useSyncExternalStore } from "react";

/**
 * Adevărat doar în browser după hidratare; pe server rămâne false.
 * Înlocuiește pattern-ul `useEffect(() => setMounted(true))` (evită ESLint react-hooks/set-state-in-effect).
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
