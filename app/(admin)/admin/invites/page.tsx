import type { Metadata } from "next";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { CreateOrgForm } from "@/components/admin/CreateOrgForm";

export const metadata: Metadata = { title: "Invite a client" };

export default function InvitePage() {
  return (
    <div className="max-w-2xl">
      <PageHeading
        no="01"
        title="Invite a client"
        description="Create the client's organization. You'll get a link to copy and send them — they set a password from it."
      />
      <Panel className="p-6">
        <CreateOrgForm />
      </Panel>
      <p className="meta mt-4">
        No email is sent — you copy the generated link and send it yourself. The
        link is valid for 12 hours and reusable until the client sets a password.
      </p>
    </div>
  );
}
