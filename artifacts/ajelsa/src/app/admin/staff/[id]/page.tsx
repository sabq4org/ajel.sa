"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import { StaffForm } from "@/components/admin/StaffForm";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

export default function EditStaffPage() {
  const params = useParams();
  const id = params.id as string;
  const [user, setUser] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [u, a] = await Promise.all([
          fetch(`/api/staff/${id}`).then((r) => r.json()),
          fetch(`/api/staff/${id}/activity`).then((r) => r.json()),
        ]);
        if (!mounted) return;
        if (u.error) throw new Error(u.error);
        setUser(u.user);
        setActivity(a.items ?? []);
      } catch (e: any) {
        setError(e.message || "تعذّر تحميل المنسوب");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 grid place-items-center text-ink-soft">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  if (error || !user) {
    return (
      <div className="card p-8 text-center text-ink-soft">
        {error || "غير موجود"}
        <div className="mt-3">
          <Link href="/admin/staff" className="text-burgundy hover:underline">العودة للقائمة</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminTopbar
        title={user.fullName}
        subtitle={user.jobTitle || user.email}
        actions={
          <Link
            href="/admin/staff"
            className="bg-paper border border-line text-ink-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:bg-bg-2"
          >
            <ArrowRight size={14} /> العودة للقائمة
          </Link>
        }
      />
      <StaffForm mode="edit" initial={user} initialActivity={activity} />
    </>
  );
}
