import { Panel } from "@/components/ui/Panel";
import { SYSTEM_STATUS, type PortalSystem } from "@/lib/systems";

/**
 * A single system in the "book of systems" — illustration banner on top,
 * status + name + copy below. Presentational; safe in a server component.
 */
export function SystemCard({ system }: { system: PortalSystem }) {
  const status = SYSTEM_STATUS[system.status];

  return (
    <Panel
      as="article"
      className="overflow-hidden transition-colors hover:border-border-strong"
    >
      {/* Illustration banner */}
      <div className="relative flex h-40 items-center justify-center border-b border-border bg-gradient-to-br from-surface-2 to-elevated">
        {/* Faint accent glow behind the artwork */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(60% 80% at 50% 30%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 70%)",
          }}
          aria-hidden
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative local SVG; avoids next/image SVG optimizer config */}
        <img
          src={system.image}
          alt=""
          width={220}
          height={110}
          className="relative h-auto w-[68%] max-w-[240px]"
          aria-hidden
        />
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: status.color }}
            aria-hidden
          />
          <span className="meta" style={{ color: status.color }}>
            {status.label}
          </span>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-fg">{system.name}</h3>
        <p className="mt-0.5 text-sm text-accent">{system.tagline}</p>
        <p className="mt-2 text-sm text-muted">{system.description}</p>
      </div>
    </Panel>
  );
}
