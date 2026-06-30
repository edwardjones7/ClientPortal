import { exitClientView, exitEmployeeView } from "@/app/(admin)/actions";

/**
 * Shown at the top of every (client) page while an admin is previewing the
 * portal as a client org or as an employee. Makes the impersonation obvious and
 * offers a one-click exit back to the matching admin area.
 */
export function ViewAsBanner({
  orgName,
  isEmployee = false,
}: {
  orgName: string;
  isEmployee?: boolean;
}) {
  return (
    <div className="mb-8 flex items-center justify-between gap-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-3">
      <p className="text-sm text-fg">
        {isEmployee ? (
          <>
            Previewing as <span className="font-medium">{orgName}</span> — this
            is what your team sees.
          </>
        ) : (
          <>
            Previewing as <span className="font-medium">{orgName}</span> — this
            is what the client sees.
          </>
        )}
      </p>
      <form action={isEmployee ? exitEmployeeView : exitClientView}>
        <button
          type="submit"
          className="shrink-0 text-xs font-medium text-accent hover:text-fg"
        >
          {isEmployee ? "Exit employee view →" : "Exit client view →"}
        </button>
      </form>
    </div>
  );
}
