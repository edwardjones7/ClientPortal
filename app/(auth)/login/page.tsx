import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mb-6 text-sm text-muted">
        The portal for Elenos clients. Submit work, track updates, talk to us.
      </p>
      {error === "link" ? (
        <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          That link expired or was already used. Sign in below, or ask Elenos to
          resend your invite.
        </p>
      ) : null}
      <LoginForm next={next} />
    </div>
  );
}
