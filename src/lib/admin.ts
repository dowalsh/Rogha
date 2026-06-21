import { getDbUser } from "./getDbUser";

export async function requireAdmin() {
  const { user, error } = await getDbUser();
  if (error || !user) return { admin: null, error: error ?? { code: "UNAUTHORIZED", status: 401 } };
  if (user.role !== "ADMIN") return { admin: null, error: { code: "FORBIDDEN", status: 403 } };
  return { admin: user, error: null };
}
