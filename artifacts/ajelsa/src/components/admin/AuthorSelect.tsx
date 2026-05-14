"use client";

/**
 * AuthorSelect — searchable single-select dropdown for picking an author
 * (كاتب رأي) when authoring/editing opinion pieces.
 *
 * - Renders the picked author with avatar + position
 * - Opens a panel with a search input and a scrollable list (avatar+name+role)
 * - Filters client-side by Arabic full name and position substring
 * - Exposes `onChange(id)` so the parent can keep using a plain string state
 *
 * Keyboard: clicking the trigger toggles the panel; Esc / outside-click closes it.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check, UserCircle2 } from "lucide-react";

export type AuthorOption = {
  id: string;
  fullName: string;
  position: string | null;
  avatarUrl?: string | null;
};

type Props = {
  value: string;
  options: AuthorOption[];
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function AuthorSelect({
  value,
  options,
  onChange,
  placeholder = "اختر الكاتب...",
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [value, options]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.fullName.toLowerCase().includes(q) ||
        (o.position ?? "").toLowerCase().includes(q)
    );
  }, [options, query]);

  // Outside-click / Esc to close
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative" dir="rtl">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-right transition-all ${
          open
            ? "border-burgundy bg-rose-cream/20"
            : "border-line bg-paper hover:border-burgundy/40"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <Avatar author={selected} />
        <div className="flex-1 min-w-0 text-right">
          {selected ? (
            <>
              <div className="text-[13px] font-bold text-ink truncate">{selected.fullName}</div>
              {selected.position && (
                <div className="text-[11px] text-ink-soft truncate">{selected.position}</div>
              )}
            </>
          ) : (
            <div className="text-[13px] text-ink-faint">{placeholder}</div>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-paper border border-line rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line bg-bg-2 px-3 py-2">
            <Search size={13} className="text-ink-soft" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن كاتب..."
              className="flex-1 bg-transparent outline-none text-[13px]"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-[12px] text-ink-soft">
                لا توجد نتائج تطابق "{query}"
              </div>
            ) : (
              filtered.map((o) => {
                const isSel = o.id === value;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onChange(o.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-right transition-colors ${
                      isSel ? "bg-rose-cream/40" : "hover:bg-bg-2"
                    }`}
                  >
                    <Avatar author={o} />
                    <div className="flex-1 min-w-0 text-right">
                      <div className="text-[13px] font-bold text-ink truncate">{o.fullName}</div>
                      {o.position && (
                        <div className="text-[11px] text-ink-soft truncate">{o.position}</div>
                      )}
                    </div>
                    {isSel && <Check size={14} className="text-burgundy flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ author }: { author: AuthorOption | null }) {
  if (!author) {
    return (
      <div className="w-9 h-9 rounded-full bg-bg-2 grid place-items-center flex-shrink-0">
        <UserCircle2 size={20} className="text-ink-soft" />
      </div>
    );
  }
  if (author.avatarUrl) {
    return (
      <img
        src={author.avatarUrl}
        alt={author.fullName}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-burgundy to-burgundy-soft text-white grid place-items-center text-sm font-bold flex-shrink-0">
      {author.fullName[0]}
    </div>
  );
}
