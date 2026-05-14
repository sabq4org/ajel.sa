"use client";

/**
 * Toast — نظام إشعارات بسيط
 * استخدام:
 *   import { toast } from "@/components/admin/Toast";
 *   toast.success("تم الحفظ");
 *   toast.error("حدث خطأ");
 */
import { useEffect, useState } from "react";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; text: string };

let counter = 0;
const listeners: Array<(items: ToastItem[]) => void> = [];
let queue: ToastItem[] = [];

function emit() {
  for (const l of listeners) l([...queue]);
}

function push(kind: ToastKind, text: string) {
  const item: ToastItem = { id: ++counter, kind, text };
  queue = [...queue, item];
  emit();
  setTimeout(() => {
    queue = queue.filter((t) => t.id !== item.id);
    emit();
  }, 3500);
}

export const toast = {
  success: (t: string) => push("success", t),
  error: (t: string) => push("error", t),
  info: (t: string) => push("info", t),
};

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.push(setItems);
    return () => {
      const i = listeners.indexOf(setItems);
      if (i >= 0) listeners.splice(i, 1);
    };
  }, []);

  return (
    <div className="fixed top-5 left-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg dark:shadow-black/50 text-sm font-medium border animate-in slide-in-from-top-2 fade-in duration-200 ${
            t.kind === "success"
              ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
              : t.kind === "error"
              ? "bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200"
              : "bg-sky-50 dark:bg-sky-500/15 border-sky-200 dark:border-sky-500/30 text-sky-900 dark:text-sky-200"
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
