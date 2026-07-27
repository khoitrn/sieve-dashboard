import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-6 py-10 text-sm" style={{ color: "var(--ink-muted)" }}>
          Loading&hellip;
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
