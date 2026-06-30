import type { Metadata } from "next";
import { PageHeading } from "@/components/brand/PageHeading";
import { InviteHub } from "@/components/admin/InviteHub";

export const metadata: Metadata = { title: "Invite" };

export default function InvitePage() {
  return (
    <div className="max-w-2xl">
      <PageHeading
        no="01"
        title="Invite"
        description="Add a client business or an internal team member. You'll get a link to copy and send them — they set a password from it."
      />
      <InviteHub />
    </div>
  );
}
