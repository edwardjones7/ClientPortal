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
        description="Create the client's organization and send their first login. They set a password from the emailed link."
      />
      <Panel className="p-6">
        <CreateOrgForm />
      </Panel>
      <p className="meta mt-4">
        Invites use Supabase email · configure SMTP for production deliverability
      </p>
    </div>
  );
}
