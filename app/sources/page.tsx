import { Suspense } from "react";
import { SourcesView } from "@/components/SourcesView";

export default function SourcesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-6 py-10 text-sm" style={{ color: "var(--ink-muted)" }}>
          Loading&hellip;
        </div>
      }
    >
      <SourcesView />
    </Suspense>
  );
}
