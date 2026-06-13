import type { Metadata } from "next";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { NewTicketForm } from "@/components/tickets/NewTicketForm";

export const metadata: Metadata = { title: "New request" };

export default function NewTicketPage() {
  return (
    <div className="max-w-2xl">
      <PageHeading
        no="01"
        title="New request"
        description="Tell us what you need. The more context, the faster it ships."
        action={
          <ButtonLink href="/tickets" variant="ghost" size="sm">
            ← Back
          </ButtonLink>
        }
      />
      <Panel className="p-6">
        <NewTicketForm />
      </Panel>
    </div>
  );
}
