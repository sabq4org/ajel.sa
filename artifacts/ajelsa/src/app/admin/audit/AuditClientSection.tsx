"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import type { AuditLog } from "@/lib/db/schema";

type FilterGroup = "all" | "articles" | "users" | "comments" | "auth";

const ACTION_META: Record<
  string,
  { icon: string; label: string; color: string; group: FilterGroup }
> = {
  article_created:   { icon: "✏️", label: "إنشاء خبر",       color: "text-blue-600",   group: "articles" },
  article_updated:   { icon: "📝", label: "تعديل خبر",        color: "text-yellow-600", group: "articles" },
  article_published: { icon: "✅", label: "نشر خبر",          color: "text-green-600",  group: "articles" },
  article_deleted:   { icon: "🗑️", label: "حذف خبر",          color: "text-red-600",    group: "articles" },
  article_archived:  { icon: "📦", label: "أرشفة خبر",        color: "text-gray-500",   group: "articles" },
  user_created:      { icon: "👤", label: "إضافة مستخدم",     color: "text-purple-600", group: "users" },
  user_updated:      { icon: "👤", label: "تعديل مستخدم",     color: "text-purple-400", group: "users" },
  comment_approved:  { icon: "💬", label: "قبول تعليق",       color: "text-teal-600",   group: "comments" },
  comment_deleted:   { icon: "🚫", label: "حذف تعليق",        color: "text-red-400",    group: "comments" },
  category_created:  { icon: "📁", label: "إضافة قسم",        color: "text-indigo-600", group: "articles" },
  category_updated:  { icon: "📂", label: "تعديل قسم",        color: "text-indigo-400", group: "articles" },
  login:             { icon: "🔑", label: "تسجيل دخول",       color: "text-green-500",  group: "auth" },
  logout:            { icon: "🚪", label: "تسجيل خروج",       color: "text-gray-400",   group: "auth" },
};

const FILTER_GROUPS: { key: FilterGroup; label: string }[] = [
  { key: "all",      label: "الكل" },
  { key: "articles", label: "الأخبار" },
  { key: "users",    label: "المستخدمون" },
  { key: "comments", label: "التعليقات" },
  { key: "auth",     label: "المصادقة" },
];

function timeAgo(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
}

function exportCSV(logs: AuditLog[]) {
  const header = ["الوقت", "الإجراء", "الكيان", "العنوان", "المستخدم", "IP"];
  const rows = logs.map((l) => [
    new Date(l.createdAt).toISOString(),
    ACTION_META[l.action]?.label ?? l.action,
    l.entityType ?? "",
    l.entityTitle ?? "",
    l.userFullName ?? "",
    l.ipAddress ?? "",
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuditClientSection({ logs }: { logs: AuditLog[] }) {
  const [filter, setFilter] = useState<FilterGroup>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return logs;
    return logs.filter((l) => ACTION_META[l.action]?.group === filter);
  }, [logs, filter]);

  return (
    <div>
      {/* Filter + Export Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {FILTER_GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => setFilter(g.key)}
            className={`px-4 py-1.5 rounded-xl text-[13px] font-semibold transition-all border ${
              filter === g.key
                ? "bg-burgundy text-white border-burgundy"
                : "bg-paper text-ink-2 border-line hover:bg-bg-2"
            }`}
          >
            {g.label}
          </button>
        ))}
        <button
          onClick={() => exportCSV(filtered)}
          className="mr-auto px-4 py-1.5 rounded-xl text-[13px] font-semibold bg-bg-2 text-ink-2 border border-line hover:bg-bg-3 transition-all"
        >
          📥 تصدير CSV
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card py-16 text-center text-ink-soft">
          <div className="text-4xl mb-3">📋</div>
          <div className="font-semibold">لا توجد نشاطات بعد</div>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-bg-2/60">
                  <th className="text-right px-4 py-3 text-ink-soft font-semibold">الوقت</th>
                  <th className="text-right px-4 py-3 text-ink-soft font-semibold">الإجراء</th>
                  <th className="text-right px-4 py-3 text-ink-soft font-semibold">العنوان / الكيان</th>
                  <th className="text-right px-4 py-3 text-ink-soft font-semibold">المستخدم</th>
                  <th className="text-right px-4 py-3 text-ink-soft font-semibold">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => {
                  const meta = ACTION_META[log.action] ?? {
                    icon: "•",
                    label: log.action,
                    color: "text-ink",
                    group: "all",
                  };
                  return (
                    <tr
                      key={log.id}
                      className={`border-b border-line/50 hover:bg-bg-2/40 transition-colors ${
                        i % 2 === 0 ? "" : "bg-bg-2/20"
                      }`}
                    >
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                        {timeAgo(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`flex items-center gap-1.5 font-medium ${meta.color}`}>
                          <span>{meta.icon}</span>
                          <span>{meta.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        {log.entityTitle ? (
                          <span className="text-ink font-medium truncate block" title={log.entityTitle}>
                            {log.entityTitle}
                          </span>
                        ) : log.entityType ? (
                          <span className="text-ink-soft">{log.entityType}</span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.userFullName ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-rose-cream text-burgundy grid place-items-center text-[10px] font-bold flex-shrink-0">
                              {log.userFullName[0]}
                            </span>
                            <span className="text-ink">{log.userFullName}</span>
                          </span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-soft font-mono text-[11px]">
                        {log.ipAddress ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-[11px] text-ink-soft border-t border-line/50 bg-bg-2/40">
            يعرض آخر {filtered.length} حدث
          </div>
        </div>
      )}
    </div>
  );
}
