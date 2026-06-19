import type { AdminSupabaseClient } from "@/server/supabaseAdmin";
import type { AdminUser } from "./types";

export type AdminRole = "owner" | "operator" | "readonly";

export async function getAdminUserForAuthUser(
  supabase: AdminSupabaseClient,
  authUserId: string,
  allowedRoles: AdminRole[] = ["owner", "operator", "readonly"],
): Promise<AdminUser | null> {
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("id", authUserId)
    .eq("is_active", true)
    .in("role", allowedRoles)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function assertAdminUser(
  supabase: AdminSupabaseClient,
  authUserId: string,
  allowedRoles: AdminRole[] = ["owner", "operator", "readonly"],
): Promise<AdminUser> {
  const adminUser = await getAdminUserForAuthUser(supabase, authUserId, allowedRoles);

  if (!adminUser) {
    throw new Error("Admin access denied.");
  }

  return adminUser;
}
