"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield, Users, Lock, Save, Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import { AdminTopbar } from "@/components/admin/AdminLayout";
import { toast } from "@/components/admin/Toast";
import { ConfirmDialog } from "@/components/admin/Modal";
import { cn } from "@/lib/utils";
import { useMyPermissions } from "@/hooks/useMyPermissions";

type Role = {
  id: string;
  key: string;
  nameAr: string;
  nameEn: string | null;
  description: string | null;
  level: number;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
};

type Permission = {
  id: string;
  key: string;
  category: string;
  labelAr: string;
  labelEn: string | null;
};

type PermissionGroup = {
  category: string;
  labelAr: string;
  items: Permission[];
};

export default function RolesPage() {
  const { can } = useMyPermissions();
  const canCreateRole = can("roles.create");
  const canDeleteRole = can("roles.delete");
  const canEditRole = can("roles.edit");
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [rolePermIds, setRolePermIds] = useState<Set<string>>(new Set());
  const [originalPermIds, setOriginalPermIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingPerms, setSavingPerms] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Role | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLevel, setNewLevel] = useState(20);

  const activeRole = useMemo(
    () => roles.find((r) => r.id === activeRoleId) ?? null,
    [roles, activeRoleId]
  );

  const isDirty = useMemo(() => {
    if (rolePermIds.size !== originalPermIds.size) return true;
    for (const id of rolePermIds) if (!originalPermIds.has(id)) return true;
    return false;
  }, [rolePermIds, originalPermIds]);

  // Initial load
  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch("/api/roles", { credentials: "include" }),
        fetch("/api/permissions", { credentials: "include" }),
      ]);
      if (!rolesRes.ok) throw new Error("فشل تحميل الأدوار");
      if (!permsRes.ok) throw new Error("فشل تحميل الصلاحيات");
      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();
      setRoles(rolesData.items ?? []);
      setGroups(permsData.groups ?? []);
      if (rolesData.items?.[0] && !activeRoleId) {
        await selectRole(rolesData.items[0].id);
      }
    } catch (e: any) {
      toast.error(e.message ?? "فشل التحميل");
    } finally {
      setLoading(false);
    }
  }

  async function selectRole(roleId: string) {
    setActiveRoleId(roleId);
    setRolePermIds(new Set());
    setOriginalPermIds(new Set());
    try {
      const res = await fetch(`/api/roles/${roleId}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const ids = new Set<string>((data.permissions ?? []).map((p: any) => p.id as string));
      setRolePermIds(ids);
      setOriginalPermIds(new Set(ids));
    } catch {
      toast.error("فشل تحميل صلاحيات الدور");
    }
  }

  function togglePerm(permId: string) {
    setRolePermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  }

  function toggleCategory(group: PermissionGroup, allOn: boolean) {
    setRolePermIds((prev) => {
      const next = new Set(prev);
      for (const p of group.items) {
        if (allOn) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  }

  async function savePermissions() {
    if (!activeRoleId) return;
    setSavingPerms(true);
    try {
      const res = await fetch(`/api/roles/${activeRoleId}/permissions`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: Array.from(rolePermIds) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "فشل الحفظ");
      }
      setOriginalPermIds(new Set(rolePermIds));
      // Refresh role list to update permissionCount
      const rolesRes = await fetch("/api/roles", { credentials: "include" });
      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setRoles(data.items ?? []);
      }
      toast.success("تم حفظ الصلاحيات");
    } catch (e: any) {
      toast.error(e.message ?? "فشل الحفظ");
    } finally {
      setSavingPerms(false);
    }
  }

  async function createRole() {
    if (!newKey.trim() || !newName.trim()) {
      toast.error("المفتاح والاسم مطلوبان");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newKey.trim(),
          nameAr: newName.trim(),
          description: newDesc.trim() || undefined,
          level: newLevel,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "فشل الإنشاء");
      }
      const data = await res.json();
      toast.success("تم إنشاء الدور");
      setShowNewModal(false);
      setNewKey("");
      setNewName("");
      setNewDesc("");
      setNewLevel(20);
      await loadAll();
      if (data.role?.id) await selectRole(data.role.id);
    } catch (e: any) {
      toast.error(e.message ?? "فشل الإنشاء");
    } finally {
      setCreating(false);
    }
  }

  async function deleteRole(role: Role) {
    try {
      const res = await fetch(`/api/roles/${role.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "فشل الحذف");
      }
      toast.success("تم حذف الدور");
      setConfirmDelete(null);
      if (activeRoleId === role.id) setActiveRoleId(null);
      await loadAll();
    } catch (e: any) {
      toast.error(e.message ?? "فشل الحذف");
    }
  }

  return (
    <>
      <AdminTopbar
        title="الأدوار والصلاحيات"
        subtitle="إدارة الأدوار وتحديد ما يستطيع كل دور فعله في النظام"
        actions={
          canCreateRole ? (
            <button
              onClick={() => setShowNewModal(true)}
              className="bg-burgundy text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:bg-burgundy-dark transition-colors"
            >
              <Plus size={14} /> دور جديد
            </button>
          ) : null
        }
      />

      {loading ? (
        <div className="card flex items-center justify-center py-20 text-ink-soft gap-2">
          <Loader2 size={18} className="animate-spin" /> جاري التحميل...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
          {/* ── Roles sidebar ── */}
          <div className="space-y-2">
            {roles.map((r) => {
              const active = r.id === activeRoleId;
              return (
                <button
                  key={r.id}
                  onClick={() => selectRole(r.id)}
                  className={cn(
                    "w-full text-right card p-4 transition-all",
                    active
                      ? "border-burgundy bg-rose-cream"
                      : "hover:border-burgundy/40 hover:bg-bg-2"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Shield size={14} className={active ? "text-burgundy" : "text-ink-soft"} />
                    <div className="font-semibold text-ink text-[14px]">{r.nameAr}</div>
                    {r.isSystem && (
                      <span className="text-[10px] bg-bg-2 text-ink-soft px-1.5 py-0.5 rounded-full font-mono">
                        نظام
                      </span>
                    )}
                  </div>
                  {r.description && (
                    <div className="text-[11.5px] text-ink-soft leading-relaxed mb-2">
                      {r.description}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-ink-soft">
                    <span className="flex items-center gap-1">
                      <Lock size={10} /> {r.permissionCount} صلاحية
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={10} /> {r.userCount} مستخدم
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Permission matrix ── */}
          <div>
            {!activeRole ? (
              <div className="card flex flex-col items-center justify-center py-20 text-ink-soft gap-2">
                <Shield size={28} className="opacity-40" />
                اختر دورًا لعرض صلاحياته
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header bar */}
                <div className="card flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-bold text-ink">{activeRole.nameAr}</h2>
                      {activeRole.isSystem && (
                        <span className="text-[10px] bg-bg-2 text-ink-soft px-2 py-0.5 rounded-full">
                          دور نظامي
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-ink-soft font-mono">{activeRole.key}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!activeRole.isSystem && canDeleteRole && (
                      <button
                        onClick={() => setConfirmDelete(activeRole)}
                        className="bg-paper border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-[12px] font-semibold flex items-center gap-2 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={12} /> حذف
                      </button>
                    )}
                    {canEditRole && (
                      <button
                        onClick={savePermissions}
                        disabled={!isDirty || savingPerms}
                        className="bg-burgundy text-white px-4 py-2 rounded-xl text-[12px] font-semibold flex items-center gap-2 hover:bg-burgundy-dark transition-colors disabled:opacity-40"
                      >
                        {savingPerms ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        حفظ التغييرات
                      </button>
                    )}
                  </div>
                </div>

                {/* Permission groups */}
                {groups.map((group) => {
                  const allOn = group.items.every((p) => rolePermIds.has(p.id));
                  const someOn = !allOn && group.items.some((p) => rolePermIds.has(p.id));
                  return (
                    <div key={group.category} className="card">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-line">
                        <div>
                          <h3 className="text-[14px] font-bold text-ink">{group.labelAr}</h3>
                          <div className="text-[11px] text-ink-soft mt-0.5">
                            {group.items.filter((p) => rolePermIds.has(p.id)).length} / {group.items.length}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleCategory(group, allOn)}
                          className={cn(
                            "text-[11.5px] px-2.5 py-1 rounded-lg font-semibold transition-colors",
                            allOn
                              ? "bg-rose-cream text-burgundy"
                              : someOn
                              ? "bg-bg-2 text-ink-2"
                              : "bg-bg-2 text-ink-soft hover:bg-line"
                          )}
                        >
                          {allOn ? "إلغاء الكل" : "تحديد الكل"}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {group.items.map((p) => {
                          const on = rolePermIds.has(p.id);
                          return (
                            <label
                              key={p.id}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                on
                                  ? "border-burgundy/30 bg-rose-cream/40"
                                  : "border-line hover:bg-bg-2"
                              )}
                            >
                              <ToggleSwitch checked={on} onChange={() => togglePerm(p.id)} />
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium text-ink truncate">
                                  {p.labelAr}
                                </div>
                                <div className="text-[10.5px] text-ink-soft font-mono truncate">
                                  {p.key}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New role modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="bg-paper rounded-2xl border border-line max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
              <Shield size={18} /> دور جديد
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1.5">
                  المفتاح (إنجليزي)
                </label>
                <input
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toLowerCase())}
                  placeholder="مثال: senior_editor"
                  className="w-full bg-bg-2 border border-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-burgundy"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1.5">
                  الاسم بالعربي
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: محرر أول"
                  className="w-full bg-bg-2 border border-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-burgundy"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1.5">
                  الوصف (اختياري)
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-bg-2 border border-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-burgundy resize-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1.5">
                  المستوى (الترتيب) — أعلى = صلاحية أوسع
                </label>
                <input
                  type="number"
                  value={newLevel}
                  onChange={(e) => setNewLevel(parseInt(e.target.value) || 0)}
                  min={0}
                  max={1000}
                  className="w-full bg-bg-2 border border-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-burgundy"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowNewModal(false)}
                className="flex-1 bg-bg-2 text-ink-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-line transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={createRole}
                disabled={creating}
                className="flex-1 bg-burgundy text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-burgundy-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating && <Loader2 size={12} className="animate-spin" />}
                إنشاء
              </button>
            </div>
            <div className="mt-3 flex items-start gap-2 text-[11.5px] text-ink-soft p-2 rounded-lg bg-bg-2">
              <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
              <span>بعد الإنشاء يمكنك تحديد صلاحيات الدور من الشاشة الرئيسية.</span>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete ? `حذف دور "${confirmDelete.nameAr}"؟` : ""}
        message="لا يمكن التراجع عن هذا الإجراء. تأكد من نقل المستخدمين إلى دور آخر أولاً."
        confirmText="حذف"
        danger
        onConfirm={async () => {
          if (confirmDelete) await deleteRole(confirmDelete);
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onChange();
      }}
      className={cn(
        "relative inline-flex w-9 h-5 rounded-full transition-colors flex-shrink-0",
        checked ? "bg-burgundy" : "bg-line"
      )}
      aria-checked={checked}
      role="switch"
    >
      <span
        className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
          checked ? "right-0.5" : "left-0.5"
        )}
      />
    </button>
  );
}
