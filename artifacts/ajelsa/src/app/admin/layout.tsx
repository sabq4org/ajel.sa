import { AdminLayout } from "@/components/admin/AdminLayout";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Skip auth check during initial setup (when DB is empty)
  // In production, uncomment:
  // if (!session) redirect("/login");

  return (
    <AdminLayout
      user={
        session
          ? { fullName: session.fullName, role: session.role }
          : { fullName: "سلطان المالكي", role: "editor_in_chief" }
      }
    >
      {children}
    </AdminLayout>
  );
}
