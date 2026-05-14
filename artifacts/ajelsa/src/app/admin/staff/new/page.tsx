"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import { StaffForm } from "@/components/admin/StaffForm";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NewStaffPage() {
  return (
    <>
      <AdminTopbar
        title="إضافة منسوب"
        subtitle="إنشاء حساب جديد لعضو من فريق التحرير أو الإدارة"
        actions={
          <Link
            href="/admin/staff"
            className="bg-paper border border-line text-ink-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:bg-bg-2"
          >
            <ArrowRight size={14} /> العودة للقائمة
          </Link>
        }
      />
      <StaffForm mode="create" />
    </>
  );
}
