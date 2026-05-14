"use client";

/**
 * Admin storage-health surface:
 *   - <StorageHealthProvider> polls /api/admin/storage-health and exposes
 *     the result via useStorageHealth().
 *   - <StorageHealthBadge> renders a compact pill (sidebar) for at-a-glance
 *     status.
 *   - <StorageHealthMobileDot> renders a tiny color dot for the mobile topbar.
 *
 * Editors get an early warning when image storage is degraded or unavailable
 * so they can plan around it instead of being surprised when "توليد صورة"
 * fails.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { HardDrive, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export type StorageStatus = "healthy" | "degraded" | "unavailable";

export interface StorageProviderStatus {
  configured: boolean;
  usedBytes?: number;
  maxBytes?: number;
  fileCount?: number;
  percentUsed?: number;
  isNearLimit?: boolean;
  isExceeded?: boolean;
}

export interface StorageHealth {
  status: StorageStatus;
  canUpload: boolean;
  message: string;
  providers: {
    cloudinary: StorageProviderStatus;
    objectStorage: StorageProviderStatus;
    r2: StorageProviderStatus;
  };
}

interface StorageHealthState {
  health: StorageHealth | null;
  loading: boolean;
  refresh: () => void;
}

const StorageHealthContext = createContext<StorageHealthState>({
  health: null,
  loading: true,
  refresh: () => {},
});

const POLL_MS = 60_000;

export function StorageHealthProvider({ children }: { children: React.ReactNode }) {
  const [health, setHealth] = useState<StorageHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchHealth = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/admin/storage-health", {
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as StorageHealth;
      setHealth(data);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      // On hard failure (network/server down), assume unavailable so the
      // generate button stays disabled rather than failing silently.
      setHealth({
        status: "unavailable",
        canUpload: false,
        message: "تعذّر التحقق من حالة التخزين",
        providers: {
          cloudinary: { configured: false },
          objectStorage: { configured: false },
          r2: { configured: false },
        },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, POLL_MS);
    const onFocus = () => fetchHealth();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      abortRef.current?.abort();
    };
  }, [fetchHealth]);

  const value = useMemo(
    () => ({ health, loading, refresh: fetchHealth }),
    [health, loading, fetchHealth]
  );

  return (
    <StorageHealthContext.Provider value={value}>
      {children}
    </StorageHealthContext.Provider>
  );
}

export function useStorageHealth(): StorageHealthState {
  return useContext(StorageHealthContext);
}

// ─────────────────────────────────────────────────────────────────────────
// Visual components
// ─────────────────────────────────────────────────────────────────────────

function statusStyles(status: StorageStatus | "loading") {
  switch (status) {
    case "healthy":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-500/10",
        text: "text-sage dark:text-emerald-300",
        border: "border-emerald-100 dark:border-emerald-500/20",
        dot: "bg-emerald-500",
        label: "التخزين سليم",
        Icon: CheckCircle2,
      };
    case "degraded":
      return {
        bg: "bg-amber-50 dark:bg-amber-500/10",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-200 dark:border-amber-500/20",
        dot: "bg-amber-500",
        label: "قريب من الحد",
        Icon: AlertTriangle,
      };
    case "unavailable":
      return {
        bg: "bg-red-50 dark:bg-red-500/10",
        text: "text-red-600 dark:text-red-300",
        border: "border-red-200 dark:border-red-500/20",
        dot: "bg-red-500",
        label: "التخزين غير متاح",
        Icon: XCircle,
      };
    case "loading":
    default:
      return {
        bg: "bg-bg-2",
        text: "text-ink-soft",
        border: "border-line",
        dot: "bg-ink-faint",
        label: "جاري الفحص…",
        Icon: HardDrive,
      };
  }
}

/** Compact pill for the desktop sidebar (and mobile drawer). */
export function StorageHealthBadge() {
  const { health, loading } = useStorageHealth();
  const status: StorageStatus | "loading" = loading && !health ? "loading" : health?.status ?? "loading";
  const s = statusStyles(status);
  const Icon = s.Icon;

  const detail = health
    ? health.message
    : "جاري التحقق من حالة مزودات تخزين الصور…";

  const pct =
    health?.providers.objectStorage.percentUsed != null
      ? Math.round(health.providers.objectStorage.percentUsed)
      : null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] ${s.bg} ${s.text} ${s.border}`}
      title={detail}
      aria-label={`${s.label}: ${detail}`}
      role="status"
    >
      <Icon size={14} className="opacity-90 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold leading-tight truncate">{s.label}</div>
        {pct != null && (
          <div className="text-[10px] opacity-75 leading-tight">
            Object Storage · {pct}%
          </div>
        )}
      </div>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} flex-shrink-0`} />
    </div>
  );
}

/** Tiny dot for the mobile topbar — anchored to the bell area. */
export function StorageHealthMobileDot() {
  const { health, loading } = useStorageHealth();
  const status: StorageStatus | "loading" = loading && !health ? "loading" : health?.status ?? "loading";
  const s = statusStyles(status);
  const Icon = s.Icon;

  return (
    <button
      type="button"
      className={`w-9 h-9 grid place-items-center rounded-xl border ${s.border} ${s.bg} ${s.text} hover:opacity-90 transition-colors relative`}
      title={`${s.label}: ${health?.message ?? "جاري الفحص…"}`}
      aria-label={`${s.label}: ${health?.message ?? "جاري الفحص…"}`}
    >
      <Icon size={15} />
      <span
        className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${s.dot} ring-2 ring-paper`}
      />
    </button>
  );
}
