import { Suspense } from "react";
import { LibraryView } from "@/components/LibraryView";

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-6 py-10 text-sm" style={{ color: "var(--ink-muted)" }}>
          Loading&hellip;
        </div>
      }
    >
      <LibraryView />
    </Suspense>
  );
}
