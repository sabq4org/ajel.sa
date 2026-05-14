import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { ClipboardList, FileText, Trash2, Eye, Edit, LogIn, LogOut, Archive, UserPlus, UserCog, MessageSquare, FolderPlus, FolderEdit } from "lucide-react";

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${days} يوم`;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  article_created:   { label: "نشر خبر جديد",    color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",  Icon: FileText },
  article_updated:   { label: "تعديل خبر",         color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",     Icon: Edit },
  article_published: { label: "نشر للعلن",          color: "text-[#8c1d2b]",   bg: "bg-red-50 border-red-200",         Icon: Eye },
  article_deleted:   { label: "حذف خبر",            color: "text-red-700",     bg: "bg-red-50 border-red-200",         Icon: Trash2 },
  article_archived:  { label: "أرشفة",              color: "text-slate-600",   bg: "bg-slate-50 border-slate-200",     Icon: Archive },
  user_created:      { label: "إضافة محرر",          color: "text-sky-700",     bg: "bg-sky-50 border-sky-200",         Icon: UserPlus },
  user_updated:      { label: "تعديل محرر",          color: "text-sky-600",     bg: "bg-sky-50 border-sky-200",         Icon: UserCog },
  comment_approved:  { label: "قبول تعليق",          color: "text-teal-700",    bg: "bg-teal-50 border-teal-200",       Icon: MessageSquare },
  comment_deleted:   { label: "حذف تعليق",           color: "text-red-600",     bg: "bg-red-50 border-red-200",         Icon: Trash2 },
  category_created:  { label: "إضافة قسم",           color: "text-violet-700",  bg: "bg-violet-50 border-violet-200",   Icon: FolderPlus },
  category_updated:  { label: "تعديل قسم",           color: "text-violet-600",  bg: "bg-violet-50 border-violet-200",   Icon: FolderEdit },
  login:             { label: "تسجيل دخول",          color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",       Icon: LogIn },
  logout:            { label: "تسجيل خروج",          color: "text-gray-600",    bg: "bg-gray-50 border-gray-200",       Icon: LogOut },
};

export default async function AuditPage() {
  const logs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#8c1d2b]/10 grid place-items-center">
          <ClipboardList size={20} className="text-[#8c1d2b]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink">سجل النشاطات</h1>
          <p className="text-sm text-ink-soft">آخر 100 نشاط في النظام</p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="card text-center py-20">
          <ClipboardList size={40} className="mx-auto text-ink-faint mb-3" />
          <p className="text-ink-soft text-lg">لا توجد نشاطات بعد</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-2">
                  <th className="text-right px-5 py-3 text-ink-soft font-medium">الوقت</th>
                  <th className="text-right px-5 py-3 text-ink-soft font-medium">النشاط</th>
                  <th className="text-right px-5 py-3 text-ink-soft font-medium">العنصر</th>
                  <th className="text-right px-5 py-3 text-ink-soft font-medium">المستخدم</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const config = ACTION_CONFIG[log.action] ?? {
                    label: log.action,
                    color: "text-ink-soft",
                    bg: "bg-bg-2 border-line",
                    Icon: ClipboardList,
                  };
                  const { Icon } = config;
                  return (
                    <tr
                      key={log.id}
                      className={`border-b border-line last:border-0 hover:bg-bg-2/60 transition-colors ${i % 2 === 0 ? "" : "bg-paper/40"}`}
                    >
                      <td className="px-5 py-3.5 text-ink-faint whitespace-nowrap">
                        {timeAgo(log.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${config.bg} ${config.color}`}>
                          <Icon size={13} />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-ink max-w-xs">
                        {log.entityTitle ? (
                          <span className="truncate block" title={log.entityTitle}>
                            {log.entityTitle}
                          </span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {log.userFullName ? (
                          <span className="text-ink font-medium">{log.userFullName}</span>
                        ) : (
                          <span className="text-ink-faint">النظام</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
