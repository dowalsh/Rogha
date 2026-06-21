import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/");

  return <AdminDashboard />;
}
