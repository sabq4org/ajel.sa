"use client";

import { useEffect, useState } from "react";

type State = {
  loading: boolean;
  permissions: string[];
  role: string | null;
  roleId: string | null;
};

let cache: State | null = null;
let inflight: Promise<State> | null = null;

async function fetchOnce(): Promise<State> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/me/permissions", { credentials: "include" });
      if (!res.ok) {
        const empty: State = { loading: false, permissions: [], role: null, roleId: null };
        cache = empty;
        return empty;
      }
      const data = await res.json();
      const next: State = {
        loading: false,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        role: data.role ?? null,
        roleId: data.roleId ?? null,
      };
      cache = next;
      return next;
    } catch {
      const empty: State = { loading: false, permissions: [], role: null, roleId: null };
      cache = empty;
      return empty;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Client-side hook returning the current user's effective permissions.
 * Used to gate UI elements (e.g. hiding the "نشر الآن" button).
 *
 * Calls /api/me/permissions once per page load and caches in module memory.
 */
export function useMyPermissions() {
  const [state, setState] = useState<State>(() =>
    cache ?? { loading: true, permissions: [], role: null, roleId: null }
  );

  useEffect(() => {
    if (cache) {
      setState(cache);
      return;
    }
    let mounted = true;
    fetchOnce().then((s) => {
      if (mounted) setState(s);
    });
    return () => {
      mounted = false;
    };
  }, []);

  function can(perm: string): boolean {
    return state.permissions.includes(perm);
  }

  return { ...state, can };
}

/** Force a refresh of the cached permissions (e.g. after role change). */
export function invalidateMyPermissionsCache(): void {
  cache = null;
}
