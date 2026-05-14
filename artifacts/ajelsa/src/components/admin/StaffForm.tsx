"use client";

/**
 * StaffForm — shared two-column editor used by both /admin/staff/new and
 * /admin/staff/[id].
 *
 * Tabs:
 *  1. Basic — name, email, phone, role
 *  2. Profile — avatar/cover, job title, dept, bio
 *  3. Social — handles
 *  4. Role & Permissions — role + custom overrides
 *  5. Security — password (admin reset / require change)
 *  6. Status — active/inactive, leftAt
 *  7. Activity — read-only timeline (existing user only)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Save, Loader2, User as UserIcon, Image as ImageIcon, Share2, Shield,
  KeyRound, ToggleRight, History, Upload, BadgeCheck, Mail, Phone, Briefcase,
  Eye, Trash2, AlertTriangle, RefreshCw, Globe, Twitter, Facebook,
  Instagram, Linkedin, Youtube, Music2, Check, X as XIcon,
} from "lucide-react";
import { toast } from "@/components/admin/Toast";
import { ConfirmDialog, Modal } from "@/components/admin/Modal";
import { ACTIVITY_LABELS_AR, type ActivityAction } from "@/lib/activity-labels";

type Role = { id: string; key: string; nameAr: string; level: number };

type Permission = {
  id: string;
  key: string;
  category: string;
  labelAr: string;
};

type PermissionGroup = { category: string; labelAr: string; items: Permission[] };

type StaffData = {
  id: string;
  email: string;
  fullName: string;
  displayName: string | null;
  slug: string | null;
  bio: string | null;
  shortBio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  alternateEmail: string | null;
  jobTitle: string | null;
  department: string | null;
  twitterHandle: string | null;
  facebookHandle: string | null;
  instagramHandle: string | null;
  linkedinHandle: string | null;
  youtubeHandle: string | null;
  tiktokHandle: string | null;
  websiteUrl: string | null;
  roleId: string | null;
  customPermissions: { add: string[]; remove: string[] } | null;
  isActive: boolean;
  isVerified: boolean;
  mustChangePassword: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  loginCount: number;
  joinedAt: string | null;
  leftAt: string | null;
  internalNotes: string | null;
  createdAt: string;
};

type ActivityRow = {
  id: string;
  action: ActivityAction;
  actorName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  details: any;
};

type Props = {
  mode: "create" | "edit";
  initial?: StaffData;
  initialActivity?: ActivityRow[];
};

const TABS = [
  { id: "basic", label: "الأساسية", icon: UserIcon },
  { id: "profile", label: "الملف الشخصي", icon: ImageIcon },
  { id: "social", label: "وسائل التواصل", icon: Share2 },
  { id: "role", label: "الدور والصلاحيات", icon: Shield },
  { id: "security", label: "الأمان", icon: KeyRound },
  { id: "status", label: "الحالة", icon: ToggleRight },
  { id: "activity", label: "سجل النشاط", icon: History },
] as const;

type TabId = typeof TABS[number]["id"];

type StaffFormState = Partial<StaffData> & {
  password?: string;
  /** Legacy enum value sent only on create */
  role?: string;
};

type SetField = <K extends keyof StaffFormState>(k: K, v: StaffFormState[K]) => void;

type SocialKey =
  | "twitterHandle"
  | "facebookHandle"
  | "instagramHandle"
  | "linkedinHandle"
  | "youtubeHandle"
  | "tiktokHandle";

type TabBaseProps = {
  form: StaffFormState;
  setField: SetField;
  mode: "create" | "edit";
  userId?: string;
  onRefresh?: () => void;
};

type RoleTabProps = TabBaseProps & {
  roles: Role[];
  permissions: PermissionGroup[];
  rolePerms: string[];
};

export function StaffForm({ mode, initial, initialActivity }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("basic");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<StaffFormState>(
    initial ?? {
      isActive: true,
      isVerified: false,
      mustChangePassword: true,
      role: "writer",
    }
  );

  // Reference tables
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionGroup[]>([]);
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>(initialActivity ?? []);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    void loadRoles();
    void loadPermissions();
    void loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return;
      const d = await res.json();
      setCurrentUserId(d.userId ?? null);
    } catch {}
  }

  useEffect(() => {
    if (form.roleId) void loadRolePerms(form.roleId);
    else setRolePerms([]);
  }, [form.roleId]);

  async function loadRoles() {
    try {
      const res = await fetch("/api/roles");
      const d = await res.json();
      setRoles((d.items ?? []).map((r: any) => ({ id: r.id, key: r.key, nameAr: r.nameAr, level: r.level })));
    } catch {}
  }

  async function loadPermissions() {
    try {
      const res = await fetch("/api/permissions");
      const d = await res.json();
      setPermissions(d.groups ?? []);
    } catch {}
  }

  async function loadRolePerms(roleId: string) {
    try {
      const res = await fetch(`/api/roles/${roleId}/permissions`);
      const d = await res.json();
      setRolePerms((d.items ?? []).map((p: any) => p.key));
    } catch {}
  }

  async function refreshActivity() {
    if (mode !== "edit" || !initial?.id) return;
    try {
      const res = await fetch(`/api/staff/${initial.id}/activity`);
      const d = await res.json();
      setActivity(d.items ?? []);
    } catch {}
  }

  // Last-saved indicator (shown next to the Save button so the operator
  // gets immediate visual confirmation after Ctrl+S without scrolling to
  // the toast).
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Keyboard shortcuts (parity with the article editor):
  //   Ctrl/Cmd+S      → save
  //   Ctrl/Cmd+Enter  → save (for users who prefer the GitHub idiom)
  //   Esc             → return to the staff list (cancel edit)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isSaveKey =
        (e.metaKey || e.ctrlKey) &&
        (e.key.toLowerCase() === "s" || e.key === "Enter");
      if (isSaveKey) {
        e.preventDefault();
        if (!saving) void handleSave();
        return;
      }
      if (e.key === "Escape") {
        const target = e.target as HTMLElement | null;
        // Don't intercept Esc when the user is in a text field — let the
        // browser handle field-level cancellation first.
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        router.push("/admin/staff");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // handleSave reads the latest `form` via closure on each invocation
    // because we re-bind on every render of the parent component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, router]);

  const setField: SetField = (k, v) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  async function handleSave() {
    if (!form.fullName?.trim()) {
      toast.error("الاسم مطلوب");
      setTab("basic");
      return;
    }
    if (mode === "create" && !form.email?.trim()) {
      toast.error("البريد مطلوب");
      setTab("basic");
      return;
    }
    setSaving(true);
    try {
      const url = mode === "create" ? "/api/staff" : `/api/staff/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      type SavePayload = {
        fullName?: string;
        displayName: string | null;
        slug: string | null;
        jobTitle: string | null;
        department: string | null;
        phone: string | null;
        alternateEmail: string | null;
        shortBio: string | null;
        bio: string | null;
        avatarUrl: string | null;
        coverUrl: string | null;
        twitterHandle: string | null;
        facebookHandle: string | null;
        instagramHandle: string | null;
        linkedinHandle: string | null;
        youtubeHandle: string | null;
        tiktokHandle: string | null;
        websiteUrl: string | null;
        isVerified: boolean;
        internalNotes: string | null;
        email?: string;
        password?: string;
        roleId?: string | null;
        role?: string;
        isActive?: boolean;
        mustChangePassword?: boolean;
        customPermissions?: { add: string[]; remove: string[] } | null;
      };

      const payload: SavePayload = {
        fullName: form.fullName,
        displayName: form.displayName || null,
        slug: form.slug || null,
        jobTitle: form.jobTitle || null,
        department: form.department || null,
        phone: form.phone || null,
        alternateEmail: form.alternateEmail || null,
        shortBio: form.shortBio || null,
        bio: form.bio || null,
        avatarUrl: form.avatarUrl || null,
        coverUrl: form.coverUrl || null,
        twitterHandle: form.twitterHandle || null,
        facebookHandle: form.facebookHandle || null,
        instagramHandle: form.instagramHandle || null,
        linkedinHandle: form.linkedinHandle || null,
        youtubeHandle: form.youtubeHandle || null,
        tiktokHandle: form.tiktokHandle || null,
        websiteUrl: form.websiteUrl || null,
        isVerified: !!form.isVerified,
        internalNotes: form.internalNotes || null,
      };
      if (mode === "create") {
        payload.email = form.email;
        payload.password = form.password || undefined;
        payload.roleId = form.roleId || null;
        payload.role = form.role || "writer";
        payload.isActive = form.isActive ?? true;
        payload.mustChangePassword = form.mustChangePassword ?? true;
      } else {
        // Persist custom permission overrides (gated server-side by
        // staff.override_permissions). Always send so revoking back to
        // null also propagates.
        payload.customPermissions = form.customPermissions ?? null;
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحفظ");
      toast.success(mode === "create" ? "تم إنشاء المنسوب" : "تم الحفظ");
      if (mode === "create") {
        if (data.passwordWasGenerated) {
          toast.info(
            "تم توليد كلمة مرور مؤقتة — راجع سجل الخادم أو استخدم «إعادة تعيين كلمة المرور» لمشاركتها"
          );
        }
        router.push(`/admin/staff/${data.user.id}`);
      } else {
        setLastSavedAt(new Date());
        await refreshActivity();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  const currentRole = useMemo(
    () => roles.find((r) => r.id === form.roleId),
    [roles, form.roleId]
  );

  const showActivityTab = mode === "edit";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
      {/* ── Left: live preview + tab nav + actions ── */}
      <div className="space-y-4">
        <ProfilePreviewCard form={form} roleNameAr={currentRole?.nameAr} />
        <div className="card p-3">
          <nav className="flex flex-col gap-1">
            {TABS.filter((t) => t.id !== "activity" || showActivityTab).map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] text-right transition-all ${
                    active
                      ? "bg-burgundy text-white shadow-sm"
                      : "text-ink-2 hover:bg-bg-2"
                  }`}
                >
                  <Icon size={14} className="opacity-90" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {mode === "edit" && initial?.id && (
          <div className="card p-3 space-y-2">
            <Link
              href={`/admin/staff/${initial.id}/profile`}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] text-ink-2 hover:bg-bg-2 hover:text-burgundy"
            >
              <Eye size={14} /> معاينة الملف الشخصي
            </Link>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-burgundy text-white px-4 py-3 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 shadow-red hover:bg-burgundy-dark disabled:opacity-50"
          title="Ctrl/Cmd + S"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {mode === "create" ? "إنشاء المنسوب" : "حفظ التعديلات"}
        </button>
        <SaveStatusIndicator saving={saving} lastSavedAt={lastSavedAt} mode={mode} />
        <Link
          href="/admin/staff"
          className="w-full block text-center px-4 py-2.5 rounded-xl text-[13px] font-semibold text-ink-2 border border-line hover:bg-bg-2"
        >
          العودة للقائمة
        </Link>
      </div>

      {/* ── Right: tab body ── */}
      <div className="card p-6 min-h-[60vh]">
        {tab === "basic" && (
          <BasicTab form={form} setField={setField} mode={mode} />
        )}
        {tab === "profile" && (
          <ProfileTab form={form} setField={setField} mode={mode} userId={initial?.id} />
        )}
        {tab === "social" && (
          <SocialTab form={form} setField={setField} mode={mode} />
        )}
        {tab === "role" && (
          <RolePermsTab
            form={form}
            setField={setField}
            roles={roles}
            permissions={permissions}
            rolePerms={rolePerms}
            mode={mode}
            userId={initial?.id}
          />
        )}
        {tab === "security" && (
          <SecurityTab
            form={form}
            setField={setField}
            mode={mode}
            userId={initial?.id}
            onRefresh={refreshActivity}
            isSelf={!!currentUserId && currentUserId === initial?.id}
          />
        )}
        {tab === "status" && (
          <StatusTab form={form} setField={setField} mode={mode} userId={initial?.id} onRefresh={refreshActivity} />
        )}
        {tab === "activity" && showActivityTab && (
          <ActivityTab items={activity} onRefresh={refreshActivity} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SaveStatusIndicator — tiny "آخر حفظ منذ …" + shortcut hint under the
// Save button, mirrors the article editor's status pill.
// ─────────────────────────────────────────────────────────────────────────────
function SaveStatusIndicator({
  saving, lastSavedAt, mode,
}: { saving: boolean; lastSavedAt: Date | null; mode: "create" | "edit" }) {
  // Re-render every 30s so the relative timestamp ("منذ دقيقة") stays fresh
  // without forcing the parent to re-render on every state change.
  const [, force] = useState(0);
  useEffect(() => {
    if (!lastSavedAt) return;
    const t = window.setInterval(() => force((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, [lastSavedAt]);

  if (saving) {
    return (
      <p className="text-[11px] text-ink-soft text-center flex items-center justify-center gap-1.5">
        <Loader2 size={11} className="animate-spin" /> جارٍ الحفظ…
      </p>
    );
  }
  if (lastSavedAt) {
    return (
      <p className="text-[11px] text-emerald-600 text-center flex items-center justify-center gap-1.5">
        <Check size={11} /> تم الحفظ {relativeTime(lastSavedAt)}
        <span className="text-ink-faint">· Ctrl+S</span>
      </p>
    );
  }
  return (
    <p className="text-[11px] text-ink-faint text-center">
      {mode === "create" ? "اضغط Ctrl+S للإنشاء" : "اضغط Ctrl+S للحفظ · Esc للإلغاء"}
    </p>
  );
}

function relativeTime(d: Date): string {
  const diff = Math.max(0, Date.now() - d.getTime());
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return d.toLocaleString("ar");
}

// ─────────────────────────────────────────────────────────────────────────────
// Basic tab
// ─────────────────────────────────────────────────────────────────────────────
function BasicTab({ form, setField, mode, userId }: TabBaseProps) {
  // Real-time uniqueness probes for email (create only) and slug.
  // Debounced 400ms; never blocks the form — server-side validation is
  // still authoritative on submit.
  const emailCheck = useUniqueCheck({
    field: "email",
    value: form.email ?? "",
    excludeId: userId,
    enabled: mode === "create",
  });
  const slugCheck = useUniqueCheck({
    field: "slug",
    value: form.slug ?? "",
    excludeId: userId,
    enabled: !!(form.slug && form.slug.trim().length > 0),
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <SectionHeader title="البيانات الأساسية" />
      <Field label="الاسم الكامل *">
        <input className="input" value={form.fullName ?? ""} onChange={(e) => setField("fullName", e.target.value)} />
      </Field>
      <Field label="الاسم المعروض (اختياري)" hint="يظهر للجمهور بدلاً من الاسم الكامل">
        <input className="input" value={form.displayName ?? ""} onChange={(e) => setField("displayName", e.target.value)} />
      </Field>
      <Field label="البريد الإلكتروني *">
        <div className="relative">
          <input
            type="email"
            className="input pl-9"
            value={form.email ?? ""}
            onChange={(e) => setField("email", e.target.value)}
            disabled={mode === "edit"}
          />
          {mode === "create" && <UniqueIndicator state={emailCheck} />}
        </div>
        {mode === "edit" && <p className="text-[10px] text-ink-soft mt-1">البريد لا يمكن تغييره بعد الإنشاء</p>}
        {mode === "create" && emailCheck.state === "taken" && (
          <p className="text-[10px] text-rose-600 mt-1">هذا البريد مستخدم بالفعل</p>
        )}
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="الهاتف">
          <div className="flex">
            <span className="bg-bg-2 border border-line border-l-0 rounded-l-xl px-3 grid place-items-center"><Phone size={14} className="text-ink-soft" /></span>
            <input className="input rounded-l-none" value={form.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} />
          </div>
        </Field>
        <Field label="بريد بديل">
          <div className="flex">
            <span className="bg-bg-2 border border-line border-l-0 rounded-l-xl px-3 grid place-items-center"><Mail size={14} className="text-ink-soft" /></span>
            <input type="email" className="input rounded-l-none" value={form.alternateEmail ?? ""} onChange={(e) => setField("alternateEmail", e.target.value)} />
          </div>
        </Field>
      </div>
      {mode === "create" && (
        <Field
          label="كلمة المرور (اختياري)"
          hint="إذا تركتها فارغة سيتم توليد كلمة مرور قوية ستظهر مرة واحدة"
        >
          <input
            className="input"
            type="password"
            value={form.password ?? ""}
            onChange={(e) => setField("password", e.target.value)}
            placeholder="8 أحرف على الأقل · حرف كبير · حرف صغير · رقم"
          />
        </Field>
      )}
      <Field label="الرابط (slug)" hint="يُستخدم في عنوان الصفحة العامة /author/[slug]">
        <div className="relative">
          <input
            className="input pl-9"
            value={form.slug ?? ""}
            onChange={(e) => setField("slug", e.target.value)}
            placeholder="auto"
          />
          <UniqueIndicator state={slugCheck} />
        </div>
        {slugCheck.state === "taken" && (
          <p className="text-[10px] text-rose-600 mt-1">هذا المعرف مستخدم — اختر معرفًا آخر</p>
        )}
      </Field>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useUniqueCheck — debounced probe of /api/staff/check for email/slug
// ─────────────────────────────────────────────────────────────────────────────
type UniqueState = "idle" | "checking" | "available" | "taken" | "error";

function useUniqueCheck({
  field,
  value,
  excludeId,
  enabled,
}: {
  field: "email" | "slug";
  value: string;
  excludeId?: string;
  enabled: boolean;
}): { state: UniqueState } {
  const [state, setState] = useState<UniqueState>("idle");

  useEffect(() => {
    const trimmed = value.trim();
    if (!enabled || trimmed.length < 2) {
      setState("idle");
      return;
    }
    setState("checking");
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set(field, trimmed);
        if (excludeId) params.set("excludeId", excludeId);
        const res = await fetch(`/api/staff/check?${params.toString()}`);
        if (cancelled) return;
        if (!res.ok) {
          setState("error");
          return;
        }
        const d = await res.json();
        setState(d.available ? "available" : "taken");
      } catch {
        if (!cancelled) setState("error");
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [field, value, excludeId, enabled]);

  return { state };
}

function UniqueIndicator({ state }: { state: { state: UniqueState } }) {
  if (state.state === "idle") return null;
  return (
    <span className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center w-5 h-5">
      {state.state === "checking" && <Loader2 size={12} className="animate-spin text-ink-soft" />}
      {state.state === "available" && <Check size={12} className="text-emerald-600" />}
      {state.state === "taken" && <XIcon size={12} className="text-rose-600" />}
      {state.state === "error" && <AlertTriangle size={12} className="text-amber-500" />}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile tab
// ─────────────────────────────────────────────────────────────────────────────
function ProfileTab({ form, setField, mode, userId }: TabBaseProps) {
  return (
    <div className="space-y-5 max-w-2xl">
      <SectionHeader title="الصور والوصف" />
      <ImageUploadField
        label="صورة الغلاف (3:1)"
        value={form.coverUrl}
        userId={userId}
        endpoint="cover"
        mode={mode}
        aspectClass="aspect-[3/1]"
        onChange={(url) => setField("coverUrl", url)}
      />
      <ImageUploadField
        label="الصورة الشخصية"
        value={form.avatarUrl}
        userId={userId}
        endpoint="avatar"
        mode={mode}
        aspectClass="aspect-square w-40"
        onChange={(url) => setField("avatarUrl", url)}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="المنصب">
          <div className="flex">
            <span className="bg-bg-2 border border-line border-l-0 rounded-l-xl px-3 grid place-items-center"><Briefcase size={14} className="text-ink-soft" /></span>
            <input className="input rounded-l-none" value={form.jobTitle ?? ""} onChange={(e) => setField("jobTitle", e.target.value)} />
          </div>
        </Field>
        <Field label="القسم/الإدارة">
          <input className="input" value={form.department ?? ""} onChange={(e) => setField("department", e.target.value)} />
        </Field>
      </div>
      <Field label="نبذة قصيرة" hint="تظهر تحت الاسم في صفحة الكاتب — حد أقصى 280 حرفًا">
        <textarea className="input" rows={2} maxLength={280} value={form.shortBio ?? ""} onChange={(e) => setField("shortBio", e.target.value)} />
      </Field>
      <Field label="السيرة الكاملة">
        <textarea className="input" rows={6} value={form.bio ?? ""} onChange={(e) => setField("bio", e.target.value)} />
      </Field>
    </div>
  );
}

function ImageUploadField({
  label, value, userId, endpoint, mode, aspectClass, onChange,
}: {
  label: string;
  value: string | null | undefined;
  userId?: string;
  endpoint: "avatar" | "cover";
  mode: "create" | "edit";
  aspectClass: string;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("الملف يجب أن يكون صورة");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("الحجم الأقصى 5 ميجابايت");
      return;
    }
    setUploading(true);
    try {
      // Edit mode: upload via the staff-specific endpoint so Cloudinary
      // applies the canonical avatar/cover crops and the user record is
      // updated atomically.
      // Create mode: no userId yet, so upload via the generic /api/upload
      // chain (Cloudinary → Object Storage → R2 → local-FS) and stash the
      // returned URL in form state — it will be persisted with the create
      // POST. The staff-specific transform only applies on Cloudinary; on
      // Object Storage / R2 the buffer is stored as-is in both flows.
      if (mode === "edit" && userId) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/staff/${userId}/${endpoint}`, { method: "POST", body: fd });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "فشل الرفع");
        onChange(endpoint === "avatar" ? d.avatarUrl : d.coverUrl);
      } else {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "فشل الرفع");
        onChange(d.media?.url ?? null);
      }
      toast.success("تم رفع الصورة");
    } catch (e: any) {
      toast.error(e.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Field label={label}>
      <div className={`relative ${aspectClass} rounded-2xl overflow-hidden border-2 border-dashed border-line bg-bg-2 grid place-items-center group`}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="text-ink-soft text-center text-xs flex flex-col items-center gap-2 p-4">
            <ImageIcon size={24} className="opacity-50" />
            لا توجد صورة
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="bg-white/90 text-ink px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {value ? "تغيير" : "رفع صورة"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="bg-white/90 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Trash2 size={12} /> حذف
            </button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </Field>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Social tab
// ─────────────────────────────────────────────────────────────────────────────
function SocialTab({ form, setField }: TabBaseProps) {
  const handles: Array<{
    key: SocialKey;
    label: string;
    icon: typeof Twitter;
    placeholder: string;
  }> = [
    { key: "twitterHandle", label: "X (تويتر)", icon: Twitter, placeholder: "username" },
    { key: "facebookHandle", label: "فيسبوك", icon: Facebook, placeholder: "username" },
    { key: "instagramHandle", label: "إنستجرام", icon: Instagram, placeholder: "username" },
    { key: "linkedinHandle", label: "لينكد إن", icon: Linkedin, placeholder: "username" },
    { key: "youtubeHandle", label: "يوتيوب", icon: Youtube, placeholder: "@channel" },
    { key: "tiktokHandle", label: "تيك توك", icon: Music2, placeholder: "@username" },
  ];
  return (
    <div className="space-y-5 max-w-2xl">
      <SectionHeader title="حسابات التواصل والموقع" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {handles.map((h) => {
          const Icon = h.icon;
          return (
            <Field key={h.key} label={h.label}>
              <div className="flex">
                <span className="bg-bg-2 border border-line border-l-0 rounded-l-xl px-3 grid place-items-center"><Icon size={14} className="text-ink-soft" /></span>
                <input className="input rounded-l-none" placeholder={h.placeholder} value={form[h.key] ?? ""} onChange={(e) => setField(h.key, e.target.value)} />
              </div>
            </Field>
          );
        })}
      </div>
      <Field label="الموقع الشخصي">
        <div className="flex">
          <span className="bg-bg-2 border border-line border-l-0 rounded-l-xl px-3 grid place-items-center"><Globe size={14} className="text-ink-soft" /></span>
          <input className="input rounded-l-none" placeholder="https://..." value={form.websiteUrl ?? ""} onChange={(e) => setField("websiteUrl", e.target.value)} />
        </div>
      </Field>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role & Permissions tab
// ─────────────────────────────────────────────────────────────────────────────
function RolePermsTab({ form, setField, roles, permissions, rolePerms, mode, userId }: RoleTabProps) {
  const overrides = (form.customPermissions ?? { add: [], remove: [] }) as { add: string[]; remove: string[] };
  const baseSet = new Set<string>(rolePerms);
  const addSet = new Set(overrides.add);
  const remSet = new Set(overrides.remove);

  const isEffective = (key: string) => (baseSet.has(key) || addSet.has(key)) && !remSet.has(key);

  function toggle(key: string) {
    const inBase = baseSet.has(key);
    const eff = isEffective(key);
    let add = overrides.add.filter((k) => k !== key);
    let remove = overrides.remove.filter((k) => k !== key);
    if (eff) {
      // currently allowed → revoke
      if (inBase) remove.push(key);
    } else {
      // currently denied → grant
      if (!inBase) add.push(key);
    }
    const next = add.length === 0 && remove.length === 0 ? null : { add, remove };
    setField("customPermissions", next);
  }

  async function changeRole(newRoleId: string) {
    if (mode === "create") {
      setField("roleId", newRoleId || null);
      setField("customPermissions", null);
      return;
    }
    if (!userId) return;
    if (!confirm("تغيير الدور سيعيد تعيين الصلاحيات الخاصة. متابعة؟")) return;
    try {
      const res = await fetch(`/api/staff/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: newRoleId || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "فشل");
      setField("roleId", newRoleId || null);
      setField("customPermissions", null);
      toast.success("تم تغيير الدور");
    } catch (e: any) {
      toast.error(e.message || "فشل");
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader title="الدور" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => changeRole("")}
          className={`text-right p-3 rounded-xl border ${!form.roleId ? "border-burgundy bg-rose-cream dark:bg-rose-500/10" : "border-line hover:bg-bg-2"}`}
        >
          <div className="text-[13px] font-semibold text-ink">بدون دور</div>
          <div className="text-[11px] text-ink-soft mt-1">لا صلاحيات</div>
        </button>
        {roles.map((r: Role) => (
          <button
            key={r.id}
            type="button"
            onClick={() => changeRole(r.id)}
            className={`text-right p-3 rounded-xl border ${form.roleId === r.id ? "border-burgundy bg-rose-cream dark:bg-rose-500/10" : "border-line hover:bg-bg-2"}`}
          >
            <div className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
              <Shield size={11} className="text-burgundy" /> {r.nameAr}
            </div>
            <div className="text-[11px] text-ink-soft mt-1">المستوى {r.level}</div>
          </button>
        ))}
      </div>

      <div className="border-t border-line pt-5">
        <SectionHeader title="الصلاحيات الفعلية" hint="ملخّص ما يستطيع المنسوب فعله بعد دمج الدور والتجاوزات" />
        <EffectivePermissionsSummary
          permissions={permissions}
          baseSet={baseSet}
          addSet={addSet}
          remSet={remSet}
        />
      </div>

      <div className="border-t border-line pt-5">
        <SectionHeader title="الصلاحيات الخاصة" hint="تجاوز صلاحيات الدور لهذا المنسوب فقط" />
        {permissions.length === 0 && (
          <p className="text-sm text-ink-soft">لا توجد صلاحيات.</p>
        )}
        <div className="space-y-4 mt-3">
          {permissions.map((g: PermissionGroup) => (
            <div key={g.category} className="border border-line rounded-xl overflow-hidden">
              <div className="bg-bg-2 px-4 py-2.5 text-[13px] font-semibold text-ink">{g.labelAr}</div>
              <div className="divide-y divide-line-soft">
                {g.items.map((p) => {
                  const inBase = baseSet.has(p.key);
                  const granted = isEffective(p.key);
                  const overridden = (inBase && !granted) || (!inBase && granted);
                  return (
                    <label key={p.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-bg-2/40 cursor-pointer">
                      <div>
                        <div className="text-[13px] text-ink flex items-center gap-2">
                          {p.labelAr}
                          {overridden && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">معدّل</span>}
                          {inBase && !overridden && <span className="text-[10px] text-ink-soft">(من الدور)</span>}
                        </div>
                        <div className="text-[10px] text-ink-faint">{p.key}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={granted}
                        onChange={() => toggle(p.key)}
                        className="w-4 h-4 accent-burgundy"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Security tab
// ─────────────────────────────────────────────────────────────────────────────
function SecurityTab({ form, setField, mode, userId, onRefresh, isSelf }: TabBaseProps & { isSelf?: boolean }) {
  const [newPwd, setNewPwd] = useState("");
  const [currentPwd, setCurrentPwd] = useState("");
  const [selfNewPwd, setSelfNewPwd] = useState("");
  const [selfConfirmPwd, setSelfConfirmPwd] = useState("");
  const [working, setWorking] = useState(false);
  const [forceConfirm, setForceConfirm] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function resetPassword() {
    if (!userId) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/staff/${userId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPwd || undefined, mustChangeOnNextLogin: true }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "فشل");
      toast.success("تم تغيير كلمة المرور");
      if (d.passwordWasGenerated) {
        toast.info(
          "تم توليد كلمة مرور مؤقتة — راجع سجل الخادم لمشاركتها مع المنسوب"
        );
      }
      setNewPwd("");
      void onRefresh?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل");
    } finally {
      setWorking(false);
    }
  }

  async function selfChangePassword() {
    if (!currentPwd || !selfNewPwd) {
      toast.error("املأ كلمة المرور الحالية والجديدة");
      return;
    }
    if (selfNewPwd !== selfConfirmPwd) {
      toast.error("كلمتا المرور الجديدتان غير متطابقتين");
      return;
    }
    setWorking(true);
    try {
      const res = await fetch("/api/staff/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: selfNewPwd }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "فشل");
      toast.success("تم تغيير كلمة المرور");
      setCurrentPwd("");
      setSelfNewPwd("");
      setSelfConfirmPwd("");
      void onRefresh?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل");
    } finally {
      setWorking(false);
    }
  }

  async function forceLogout() {
    if (!userId) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/staff/${userId}/force-logout`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "فشل");
      toast.success("تم إنهاء الجلسات");
      void onRefresh?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setWorking(false);
    }
  }

  async function verifyEmail(intent: "mark" | "resend") {
    if (!userId) return;
    setVerifying(true);
    try {
      const res = await fetch(`/api/staff/${userId}/email-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: intent }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "فشل");
      if (intent === "mark") {
        setField("emailVerifiedAt", d.emailVerifiedAt);
        toast.success("تم تأكيد البريد الإلكتروني");
      } else if (d.smtpConfigured === false) {
        toast.info("سيتم إرسال رابط التأكيد عند تفعيل خدمة البريد (SMTP)");
      } else {
        toast.success("تم إرسال رابط التأكيد");
      }
      void onRefresh?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل");
    } finally {
      setVerifying(false);
    }
  }

  if (mode === "create") {
    return (
      <div className="max-w-xl space-y-5">
        <SectionHeader title="كلمة المرور" />
        <div className="card bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 p-4 flex gap-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            احفظ المنسوب أولاً ثم يمكنك إعادة تعيين كلمة المرور أو إنهاء الجلسات من هنا.
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.mustChangePassword ?? true} onChange={(e) => setField("mustChangePassword", e.target.checked)} className="w-4 h-4 accent-burgundy" />
          <span className="text-sm">إجبار تغيير كلمة المرور عند أول تسجيل دخول</span>
        </label>
      </div>
    );
  }

  const strength = passwordStrength(selfNewPwd);
  const emailVerified = !!form.emailVerifiedAt;

  return (
    <div className="max-w-xl space-y-6">
      {/* ── Email verification ── */}
      <div>
        <SectionHeader title="حالة تأكيد البريد الإلكتروني" />
        <div className="card p-4 flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            {emailVerified ? (
              <span className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center">
                <BadgeCheck size={16} />
              </span>
            ) : (
              <span className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 grid place-items-center">
                <AlertTriangle size={16} />
              </span>
            )}
            <div>
              <div className="text-sm font-semibold text-ink">
                {emailVerified ? "البريد مؤكَّد" : "البريد غير مؤكَّد"}
              </div>
              <div className="text-[11px] text-ink-soft mt-0.5">
                {emailVerified
                  ? `تم التأكيد بتاريخ ${new Date(form.emailVerifiedAt!).toLocaleDateString("ar")}`
                  : form.email || "—"}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {!emailVerified && (
              <>
                <button
                  type="button"
                  onClick={() => verifyEmail("resend")}
                  disabled={verifying}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-line text-ink-2 hover:bg-bg-2 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Mail size={12} /> إعادة إرسال رابط التأكيد
                </button>
                <button
                  type="button"
                  onClick={() => verifyEmail("mark")}
                  disabled={verifying}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-burgundy text-white hover:bg-burgundy-dark disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check size={12} /> تعليم كمؤكَّد
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Self password change (only when editing your own record) ── */}
      {isSelf && (
        <div className="border-t border-line pt-6">
          <SectionHeader title="تغيير كلمة المرور الخاصة بك" hint="يتطلب إدخال كلمة المرور الحالية للتأكد من هويتك" />
          <div className="space-y-3">
            <Field label="كلمة المرور الحالية *">
              <input type="password" className="input" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} autoComplete="current-password" />
            </Field>
            <Field label="كلمة المرور الجديدة *" hint="8 أحرف على الأقل · حرف كبير · حرف صغير · رقم">
              <input type="password" className="input" value={selfNewPwd} onChange={(e) => setSelfNewPwd(e.target.value)} autoComplete="new-password" />
              <PasswordStrengthMeter value={selfNewPwd} strength={strength} />
            </Field>
            <Field label="تأكيد كلمة المرور الجديدة *">
              <input type="password" className="input" value={selfConfirmPwd} onChange={(e) => setSelfConfirmPwd(e.target.value)} autoComplete="new-password" />
              {selfConfirmPwd && selfNewPwd !== selfConfirmPwd && (
                <p className="text-[10px] text-rose-600 mt-1">غير متطابقتين</p>
              )}
            </Field>
            <button
              onClick={selfChangePassword}
              disabled={working || !currentPwd || !selfNewPwd || selfNewPwd !== selfConfirmPwd || strength.score < 3}
              className="bg-burgundy text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {working ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              تغيير كلمة المرور
            </button>
          </div>
        </div>
      )}

      {/* ── Admin reset (no current password needed) ── */}
      <div className="border-t border-line pt-6">
        <SectionHeader title={isSelf ? "إعادة تعيين كلمة مرور المنسوب (إداري)" : "إعادة تعيين كلمة المرور"} hint="استخدم هذا عندما يفقد المنسوب كلمة المرور" />
        <div className="space-y-3">
          <Field label="كلمة مرور جديدة (اختياري)" hint="إذا تركتها فارغة سيتم توليد واحدة قوية وعرضها مرة واحدة">
            <input
              type="password"
              className="input"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="8 أحرف · حرف كبير · حرف صغير · رقم"
            />
            {newPwd && <PasswordStrengthMeter value={newPwd} strength={passwordStrength(newPwd)} />}
          </Field>
          <button
            onClick={resetPassword}
            disabled={working}
            className="bg-burgundy text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {working ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            إعادة تعيين كلمة المرور
          </button>
        </div>
      </div>

      {/* ── Sessions / sign-in info ── */}
      <div className="border-t border-line pt-6">
        <SectionHeader title="الجلسات وتسجيل الدخول" hint="نظام الجلسات يستخدم JWT بدون قاعدة جلسات مركزية، لذلك نعرض ملخّصًا من سجل النشاط" />
        <SessionsSummary form={form} />
        <button
          onClick={() => setForceConfirm(true)}
          className="mt-4 bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
        >
          <RefreshCw size={14} /> إنهاء جميع الجلسات
        </button>
        <ConfirmDialog
          open={forceConfirm}
          onClose={() => setForceConfirm(false)}
          onConfirm={forceLogout}
          title="إنهاء جلسات المنسوب"
          message="سيتم إلزام المنسوب بإعادة تسجيل الدخول. هل تريد المتابعة؟"
          danger
          confirmText="إنهاء"
        />
      </div>
    </div>
  );
}

// ─── Password strength meter (shared by self & admin reset forms) ────────────
type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string; checks: Array<{ ok: boolean; label: string }> };

function passwordStrength(pwd: string): PasswordStrength {
  const checks = [
    { ok: pwd.length >= 8, label: "٨ أحرف" },
    { ok: /[A-Z]/.test(pwd), label: "حرف كبير" },
    { ok: /[a-z]/.test(pwd), label: "حرف صغير" },
    { ok: /[0-9]/.test(pwd), label: "رقم" },
    { ok: /[^A-Za-z0-9]/.test(pwd) || pwd.length >= 12, label: "رمز خاص أو ١٢ حرفًا" },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const score = Math.min(4, passed) as 0 | 1 | 2 | 3 | 4;
  const labels = ["ضعيفة جدًا", "ضعيفة", "متوسطة", "جيدة", "قوية"];
  return { score, label: labels[score], checks };
}

function PasswordStrengthMeter({ value, strength }: { value: string; strength: PasswordStrength }) {
  if (!value) return null;
  const colors = ["bg-rose-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"];
  const widthClass = ["w-[10%]", "w-[25%]", "w-[50%]", "w-[75%]", "w-full"][strength.score];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="h-1.5 w-full bg-bg-2 rounded-full overflow-hidden">
        <div className={`h-full ${colors[strength.score]} ${widthClass} transition-all`} />
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className={`font-semibold ${strength.score >= 3 ? "text-emerald-600" : "text-amber-600"}`}>{strength.label}</span>
        <div className="flex gap-2 flex-wrap justify-end">
          {strength.checks.map((c, i) => (
            <span key={i} className={`flex items-center gap-1 ${c.ok ? "text-emerald-600" : "text-ink-faint"}`}>
              {c.ok ? <Check size={10} /> : <XIcon size={10} />} {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sessions summary (best-effort given stateless JWT) ──────────────────────
function SessionsSummary({ form }: { form: StaffFormState }) {
  const items = [
    { label: "آخر دخول", value: form.lastLoginAt ? new Date(form.lastLoginAt).toLocaleString("ar") : "—" },
    { label: "آخر نشاط", value: form.lastSeenAt ? new Date(form.lastSeenAt).toLocaleString("ar") : "—" },
    { label: "عدد مرات الدخول", value: String(form.loginCount ?? 0) },
    { label: "تاريخ الانضمام", value: form.joinedAt ? new Date(form.joinedAt).toLocaleDateString("ar") : "—" },
  ];
  return (
    <div className="card p-4 mt-2">
      <div className="grid grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={it.label} className="text-[12px]">
            <div className="text-ink-soft">{it.label}</div>
            <div className="text-ink font-semibold mt-0.5 truncate" title={it.value}>{it.value}</div>
          </div>
        ))}
      </div>
      {form.mustChangePassword && (
        <div className="mt-3 text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
          <AlertTriangle size={12} /> سيُطلب من المنسوب تغيير كلمة المرور عند الدخول التالي
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status tab
// ─────────────────────────────────────────────────────────────────────────────
function StatusTab({ form, setField, mode, userId, onRefresh }: TabBaseProps) {
  const [working, setWorking] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();

  async function toggleStatus() {
    if (mode === "create") {
      setField("isActive", !form.isActive);
      return;
    }
    if (!userId) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/staff/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !form.isActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "فشل");
      setField("isActive", !form.isActive);
      toast.success(!form.isActive ? "تم التفعيل" : "تم التعطيل");
      void onRefresh?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setWorking(false);
    }
  }

  async function deleteUser(reassignTo: string | null) {
    if (!userId) return;
    try {
      const qs = reassignTo ? `?reassignTo=${encodeURIComponent(reassignTo)}` : "";
      const res = await fetch(`/api/staff/${userId}${qs}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "فشل");
      toast.success("تم حذف المنسوب");
      router.push("/admin/staff");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <SectionHeader title="حالة الحساب" />
      <div className="card p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink">{form.isActive ? "الحساب نشط" : "الحساب معطّل"}</div>
          <div className="text-xs text-ink-soft mt-1">
            {form.isActive ? "يستطيع المنسوب تسجيل الدخول واستخدام النظام" : "لن يستطيع المنسوب تسجيل الدخول"}
          </div>
        </div>
        <button
          onClick={toggleStatus}
          disabled={working}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${form.isActive ? "bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300" : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"}`}
        >
          {form.isActive ? "تعطيل" : "تفعيل"}
        </button>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!!form.isVerified} onChange={(e) => setField("isVerified", e.target.checked)} className="w-4 h-4 accent-burgundy" />
        <span className="text-sm flex items-center gap-1.5"><BadgeCheck size={13} className="text-sky-500" /> منسوب موثَّق</span>
      </label>

      {mode === "edit" && (
        <div className="card p-4 grid grid-cols-2 gap-3">
          <DateRow label="تاريخ الانضمام" value={form.joinedAt} fallback={form.createdAt} />
          <DateRow label="تاريخ المغادرة" value={form.leftAt} placeholder="—" />
          <DateRow label="آخر دخول" value={form.lastLoginAt} placeholder="—" withTime />
          <DateRow label="آخر نشاط" value={form.lastSeenAt} placeholder="—" withTime />
        </div>
      )}

      <Field label="ملاحظات داخلية" hint="لن يراها المنسوب ولا الجمهور">
        <textarea className="input" rows={4} value={form.internalNotes ?? ""} onChange={(e) => setField("internalNotes", e.target.value)} />
      </Field>

      {mode === "edit" && (
        <div className="border-t border-line pt-5">
          <SectionHeader title="منطقة الخطر" />
          <p className="text-sm text-ink-soft mb-3">
            حذف المنسوب نهائيًا. يمكنك اختياريًا تعيين منسوب آخر لاستلام أخباره.
          </p>
          <button
            onClick={() => setDeleteOpen(true)}
            className="bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-rose-700"
          >
            <Trash2 size={14} /> حذف المنسوب نهائيًا
          </button>
          <DeleteStaffDialog
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            user={form}
            currentUserId={userId}
            onConfirm={deleteUser}
          />
        </div>
      )}
    </div>
  );
}

// Tiny read-only date row used by StatusTab for joined / left / last-login.
function DateRow({
  label, value, fallback, placeholder, withTime,
}: { label: string; value?: string | null; fallback?: string | null; placeholder?: string; withTime?: boolean }) {
  const v = value ?? fallback ?? null;
  let text = placeholder ?? "—";
  if (v) {
    const d = new Date(v);
    text = withTime ? d.toLocaleString("ar") : d.toLocaleDateString("ar");
  }
  return (
    <div className="text-[12px]">
      <div className="text-ink-soft">{label}</div>
      <div className="text-ink font-semibold mt-0.5 truncate" title={text}>{text}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfilePreviewCard — live preview of how staff appears publicly
// ─────────────────────────────────────────────────────────────────────────────
function ProfilePreviewCard({ form, roleNameAr }: { form: StaffFormState; roleNameAr?: string }) {
  const name = form.displayName || form.fullName || "اسم المنسوب";
  const initial = (name || "?").charAt(0);
  return (
    <div className="card p-0 overflow-hidden">
      <div className="aspect-[3/1] bg-gradient-to-br from-burgundy/20 to-rose-cream relative">
        {form.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.coverUrl} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="px-4 pb-4 -mt-8 relative">
        <div className="w-16 h-16 rounded-full ring-4 ring-paper bg-rose-cream dark:bg-rose-500/15 text-burgundy grid place-items-center font-bold text-xl overflow-hidden">
          {form.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="mt-2.5">
          <div className="text-[14px] font-bold text-ink flex items-center gap-1.5">
            <span className="truncate">{name}</span>
            {form.isVerified && <BadgeCheck size={14} className="text-sky-500 flex-shrink-0" />}
          </div>
          {(form.jobTitle || roleNameAr) && (
            <div className="text-[11px] text-ink-soft mt-0.5 truncate">
              {form.jobTitle || roleNameAr}
              {form.department ? ` · ${form.department}` : ""}
            </div>
          )}
          {form.shortBio && (
            <p className="text-[11px] text-ink-2 mt-1.5 line-clamp-2 leading-snug">{form.shortBio}</p>
          )}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${form.isActive ?? true ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-bg-2 text-ink-soft"}`}>
              {form.isActive ?? true ? "نشط" : "معطّل"}
            </span>
            {roleNameAr && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-cream dark:bg-rose-500/15 text-burgundy dark:text-rose-300">
                {roleNameAr}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DeleteStaffDialog — confirmation + reassignment picker
// ─────────────────────────────────────────────────────────────────────────────
type DeleteStaffDialogProps = {
  open: boolean;
  onClose: () => void;
  user: any;
  currentUserId?: string;
  onConfirm: (reassignTo: string | null) => Promise<void>;
};

function DeleteStaffDialog({ open, onClose, user, currentUserId, onConfirm }: DeleteStaffDialogProps) {
  const [options, setOptions] = useState<Array<{ id: string; fullName: string; jobTitle?: string | null }>>([]);
  const [reassignTo, setReassignTo] = useState<string>("");
  const [confirmText, setConfirmText] = useState("");
  const [working, setWorking] = useState(false);
  const expected = (user?.fullName || "").trim();

  useEffect(() => {
    if (!open) return;
    setReassignTo("");
    setConfirmText("");
    void (async () => {
      try {
        const res = await fetch(`/api/staff/options${currentUserId ? `?exclude=${currentUserId}` : ""}`);
        const d = await res.json();
        setOptions(d.items ?? []);
      } catch {}
    })();
  }, [open, currentUserId]);

  const matches = expected.length > 0 && confirmText.trim() === expected;

  async function submit() {
    if (!matches) return;
    setWorking(true);
    try {
      await onConfirm(reassignTo || null);
      onClose();
    } finally {
      setWorking(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="حذف المنسوب نهائيًا" width="max-w-lg">
      <div className="space-y-4">
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4 flex gap-3 text-sm text-rose-700 dark:text-rose-200">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            هذا الإجراء لا يمكن التراجع عنه. سيتم نقل أخبار المنسوب إلى كاتب آخر
            تختاره، أو إلى حساب «منسوب سابق» تلقائيًا للحفاظ على نسبة الأخبار.
          </div>
        </div>

        <Field label={`أعد كتابة الاسم للتأكيد: ${expected}`}>
          <input
            className="input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={expected}
            autoFocus
          />
        </Field>

        <Field label="إعادة إسناد الأخبار إلى (اختياري)" hint="إن لم تختر منسوبًا، ستُسند الأخبار تلقائيًا إلى حساب «منسوب سابق»">
          <select className="input" value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
            <option value="">— استخدم حساب «منسوب سابق» تلقائيًا —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.fullName}{o.jobTitle ? ` · ${o.jobTitle}` : ""}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex items-center gap-2 justify-start pt-2 border-t border-line">
          <button
            onClick={submit}
            disabled={!matches || working}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {working ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            حذف نهائي
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-2 hover:bg-bg-2"
          >
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EffectivePermissionsSummary
// ─────────────────────────────────────────────────────────────────────────────
function EffectivePermissionsSummary({
  permissions,
  baseSet,
  addSet,
  remSet,
}: {
  permissions: PermissionGroup[];
  baseSet: Set<string>;
  addSet: Set<string>;
  remSet: Set<string>;
}) {
  const all = permissions.flatMap((g) => g.items);
  const isEffective = (key: string) => (baseSet.has(key) || addSet.has(key)) && !remSet.has(key);
  const granted = all.filter((p) => isEffective(p.key));
  const denied = all.filter((p) => !isEffective(p.key));
  const overrides = all.filter(
    (p) => (baseSet.has(p.key) && remSet.has(p.key)) || (!baseSet.has(p.key) && addSet.has(p.key))
  );

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard color="emerald" label="مسموح" count={granted.length} icon={<Check size={14} />} />
        <SummaryCard color="rose" label="مرفوض" count={denied.length} icon={<XIcon size={14} />} />
        <SummaryCard color="amber" label="معدّل" count={overrides.length} icon={<AlertTriangle size={14} />} />
      </div>
      {granted.length > 0 && (
        <details className="border border-line rounded-xl overflow-hidden">
          <summary className="bg-bg-2 px-4 py-2 text-[12px] font-semibold text-ink cursor-pointer hover:bg-line/40">
            عرض الصلاحيات المسموحة ({granted.length})
          </summary>
          <ul className="divide-y divide-line-soft">
            {granted.map((p) => (
              <li key={p.id} className="px-4 py-2 flex items-center justify-between text-[12px]">
                <span className="text-ink">{p.labelAr}</span>
                <span className="text-[10px] text-ink-faint">{p.key}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function SummaryCard({
  color, label, count, icon,
}: { color: "emerald" | "rose" | "amber"; label: string; count: number; icon: React.ReactNode }) {
  const cls = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  }[color];
  return (
    <div className={`${cls} rounded-xl p-3 flex items-center gap-2.5`}>
      <div className="w-8 h-8 rounded-full bg-white/60 grid place-items-center">{icon}</div>
      <div>
        <div className="text-lg font-bold leading-none">{count}</div>
        <div className="text-[11px] mt-1 opacity-80">{label}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity tab
// ─────────────────────────────────────────────────────────────────────────────
function ActivityTab({ items, onRefresh }: { items: ActivityRow[]; onRefresh: () => void }) {
  // Aggregate per-day counts for the last 30 days for the inline chart.
  const days = 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets: Array<{ key: string; label: string; count: number }> = [];
  const indexByKey: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    indexByKey[key] = buckets.length;
    buckets.push({ key, label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0 });
  }
  const cutoff = today.getTime() - (days - 1) * 86_400_000;
  let totalLast30 = 0;
  for (const a of items) {
    const t = new Date(a.createdAt).getTime();
    if (t < cutoff) continue;
    const key = new Date(a.createdAt).toISOString().slice(0, 10);
    const idx = indexByKey[key];
    if (idx !== undefined) {
      buckets[idx].count++;
      totalLast30++;
    }
  }
  const peak = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader title="سجل النشاط" />
        <button onClick={onRefresh} className="text-[12px] text-burgundy hover:underline flex items-center gap-1"><RefreshCw size={12} /> تحديث</button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <div className="text-[11px] text-ink-soft">إجمالي الأحداث</div>
          <div className="text-xl font-bold text-burgundy mt-0.5">{items.length}</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-[11px] text-ink-soft">آخر 30 يومًا</div>
          <div className="text-xl font-bold text-ink mt-0.5">{totalLast30}</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-[11px] text-ink-soft">أعلى يوم</div>
          <div className="text-xl font-bold text-ink mt-0.5">{peak}</div>
        </div>
      </div>

      <div className="card p-4">
        <div className="text-[12px] text-ink-soft mb-2 flex items-center justify-between">
          <span>النشاط اليومي — آخر 30 يومًا</span>
          <span className="text-ink-faint">الأقصى: {peak}</span>
        </div>
        <div className="flex items-end gap-[2px] h-20" dir="ltr">
          {buckets.map((b) => {
            const h = Math.max(2, Math.round((b.count / peak) * 72));
            return (
              <div
                key={b.key}
                className="flex-1 bg-burgundy/15 rounded-sm relative group cursor-default"
                style={{ height: `${h}px` }}
                title={`${b.label}: ${b.count}`}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-ink-soft opacity-0 group-hover:opacity-100 whitespace-nowrap">
                  {b.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card p-8 text-center text-ink-soft text-sm">لا يوجد نشاط مسجَّل بعد.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="card p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-cream dark:bg-rose-500/15 text-burgundy dark:text-rose-300 grid place-items-center flex-shrink-0">
                <History size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-ink font-medium">
                  {ACTIVITY_LABELS_AR[it.action] ?? it.action}
                </div>
                <div className="text-[11px] text-ink-soft mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{new Date(it.createdAt).toLocaleString("ar-SA-u-ca-gregory-nu-latn")}</span>
                  {it.actorName && <span>· بواسطة {it.actorName}</span>}
                  {it.ipAddress && <span>· {it.ipAddress}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout primitives
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h3 className="text-[15px] font-bold text-ink">{title}</h3>
      {hint && <p className="text-[12px] text-ink-soft mt-0.5">{hint}</p>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-ink-soft mt-1">{hint}</p>}
    </div>
  );
}
