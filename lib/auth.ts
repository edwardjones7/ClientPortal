import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Cookie that lets an admin preview the portal as one of their client orgs.
 * Set/cleared by the `viewAsClient` / `exitClientView` admin actions; read by
 * `requireClient` so admins land in (client) pages scoped to the chosen org.
 */
export const VIEW_AS_COOKIE = "portal_view_as_org";

/**
 * Auth/session helpers for Server Components and Server Actions.
 * Route-level protection lives in middleware; these guards add a second
 * layer at the data boundary and give pages a typed profile to work with.
 */

export interface SessionUser {
  id: string;
  email: string;
  profile: Profile;
}

/**
 * Returns the current user + profile, or null if signed out.
 * Cached per-request so multiple callers share one round-trip.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) return null;

  return { id: user.id, email: user.email ?? profile.email, profile };
});

/** Require any authenticated user. Redirects to /login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Require an admin. Sends clients home, signed-out users to login. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.profile.role !== "admin") redirect("/");
  return user;
}

/**
 * If the current admin is previewing the portal as a client org, returns that
 * org's id; otherwise null. Only admins can impersonate — a regular client's
 * cookie is ignored (they're scoped by their own profile).
 */
export async function getViewAsOrgId(): Promise<string | null> {
  const user = await getSessionUser();
  if (user?.profile.role !== "admin") return null;
  const store = await cookies();
  return store.get(VIEW_AS_COOKIE)?.value ?? null;
}

/**
 * Require a client (org member). Admins are redirected to the admin area,
 * UNLESS they're previewing a specific org via the "view as client" toggle —
 * then they're treated as a member of that org. Use this on (client) pages
 * that assume an org_id exists.
 */
export async function requireClient(): Promise<SessionUser & { orgId: string }> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.profile.role === "admin") {
    const viewAs = await getViewAsOrgId();
    if (viewAs) return { ...user, orgId: viewAs };
    redirect("/admin/clients");
  }
  if (!user.profile.org_id) redirect("/login");
  return { ...user, orgId: user.profile.org_id };
}
