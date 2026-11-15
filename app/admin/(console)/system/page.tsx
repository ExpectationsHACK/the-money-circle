import { systemChecks } from "@/lib/system";
import { PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "System" };

export default function SystemPage() {
  const checks = systemChecks();
  const missing = checks.filter((c) => !c.ok && !c.optional).length;
  const areas = [...new Set(checks.map((c) => c.area))];

  return (
    <>
      <PageHeader eyebrow="Setup" title={missing === 0 ? "All systems go ✅" : `${missing} item${missing > 1 ? "s" : ""} to configure`} />
      <p className="-mt-2 text-sm text-muted">Values live in your environment variables (<code>.env.local</code> locally, hosting settings in production). See the README for step-by-step setup.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {areas.map((area) => (
          <Panel key={area} title={area}>
            <ul className="space-y-2.5 text-sm">
              {checks.filter((c) => c.area === area).map((c) => (
                <li key={c.item} className="flex items-start gap-2.5">
                  <span className={`mt-1 size-2.5 shrink-0 rounded-full ${c.ok ? "bg-moss" : c.optional ? "bg-line" : "bg-coral"}`} aria-hidden />
                  <span>
                    {c.item}
                    <span className="sr-only">{c.ok ? " (configured)" : " (missing)"}</span>
                    {!c.ok && c.optional && <span className="text-muted"> · optional</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </>
  );
}
