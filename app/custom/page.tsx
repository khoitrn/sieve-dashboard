import { Suspense } from "react";
import { CustomSkillsView } from "@/components/CustomSkillsView";

export default function CustomPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-6 py-10 text-sm" style={{ color: "var(--ink-muted)" }}>
          Loading&hellip;
        </div>
      }
    >
      <CustomSkillsView />
    </Suspense>
  );
}
