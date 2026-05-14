"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
};

export function Modal({ open, onClose, title, children, width = "max-w-lg" }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />
      <div
        className={`relative bg-paper border border-line rounded-2xl shadow-2xl dark:shadow-black/60 w-full ${width} max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-150`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-lg text-ink-soft hover:bg-bg hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

type ConfirmProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "تأكيد",
  danger = false,
}: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <p className="text-sm text-ink-2 leading-relaxed mb-6">{message}</p>
      <div className="flex items-center gap-2 justify-start">
        <button
          onClick={async () => {
            await onConfirm();
            onClose();
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
            danger ? "bg-rose-600 hover:bg-rose-700" : "bg-burgundy hover:bg-burgundy-dark dark:bg-rose-500 dark:hover:bg-rose-400"
          }`}
        >
          {confirmText}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-2 border border-line hover:bg-bg transition-colors"
        >
          إلغاء
        </button>
      </div>
    </Modal>
  );
}
