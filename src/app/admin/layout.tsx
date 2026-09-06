import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { error } = await requireAdmin();
  if (error) redirect("/");

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 max-w-7xl mx-auto py-8 px-4 space-y-6 w-full">{children}</main>
    </div>
  );
}
