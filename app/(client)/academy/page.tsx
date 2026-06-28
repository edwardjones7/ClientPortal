import type { Metadata } from "next";
import { PageHeading } from "@/components/brand/PageHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireClient } from "@/lib/auth";

export const metadata: Metadata = { title: "Academy" };

export default async function AcademyPage() {
  await requireClient();

  return (
    <div>
      <PageHeading
        no="01"
        title="Academy"
        description="Lessons and guides for getting the most out of your systems. Coming soon."
      />

      <EmptyState
        title="The Academy is on the way."
        body="We're putting together short, practical lessons on your websites, AI receptionist, and more. They'll show up here as they're ready."
      />
    </div>
  );
}
