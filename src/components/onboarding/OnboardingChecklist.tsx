"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewCircleDialog } from "@/components/NewCircleDialog";
import { CircleDialog } from "@/components/CircleDialog";
import { createCircle, getCircleById } from "@/actions/circle.action";
import { setChecklistCollapsed } from "@/actions/onboarding.action";
import { suggestCircleName } from "@/lib/circleNames";
import type { OnboardingState } from "@/lib/onboarding";

type Row = {
  key: string;
  label: string;
  done: boolean;
  action?: { label: string; onClick: () => void };
};

// Calm, dismissible progress card for a not-yet-established user — reflects
// real state (never a fake progress bar) and stays collapsible-but-recoverable
// rather than gone for good. docs/specs/2026-09-19-first-run-onboarding.md.
export function OnboardingChecklist({
  onboarding,
}: {
  onboarding: OnboardingState;
}) {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const [collapsed, setCollapsed] = useState(onboarding.checklistCollapsed);
  const [newCircleOpen, setNewCircleOpen] = useState(false);
  const [suggestedName, setSuggestedName] = useState(() => suggestCircleName());
  const [circleForInvite, setCircleForInvite] = useState<any>(null);

  const refresh = () => mutate((key) => typeof key === "string" && key.startsWith("/api/home"));

  const toggleCollapsed = (next: boolean) => {
    setCollapsed(next);
    setChecklistCollapsed(next).catch(() => {});
  };

  const handleCreateCircle = async (name: string, description?: string) => {
    await createCircle({ name, description });
    refresh();
  };

  const openInvite = async () => {
    if (!onboarding.primaryCircleId) return;
    const circle = await getCircleById(onboarding.primaryCircleId);
    setCircleForInvite(circle);
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => toggleCollapsed(false)}
        className="w-full text-left rounded-xl border bg-background/60 px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        Getting started — {rows(onboarding).filter((r) => r.done).length}/
        {rows(onboarding).length} done
      </button>
    );
  }

  const items = rows(onboarding, {
    onCreateCircle: () => {
      setSuggestedName(suggestCircleName());
      setNewCircleOpen(true);
    },
    onInvite: openInvite,
    onWritePost: () => router.push("/posts"),
  });

  return (
    <section className="rounded-xl border bg-background/60 p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-serif text-xl">Getting started</p>
          <p className="text-sm text-muted-foreground">
            A little guidance, not a checklist to finish in order.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => toggleCollapsed(true)}
          title="Collapse"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ul className="space-y-2">
        {items.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  row.done ? "bg-foreground text-background border-foreground" : "text-transparent"
                }`}
              >
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className={`text-sm truncate ${row.done ? "text-muted-foreground line-through" : ""}`}>
                {row.label}
              </span>
            </div>
            {row.action && !row.done && (
              <Button size="sm" variant="outline" onClick={row.action.onClick}>
                {row.action.label}
              </Button>
            )}
          </li>
        ))}
      </ul>

      {onboarding.hasCircle && (
        <p className="text-xs text-muted-foreground border-t pt-3">
          Your first edition lands Sunday, once everyone's had a chance to write.
        </p>
      )}

      <NewCircleDialog
        open={newCircleOpen}
        onClose={() => setNewCircleOpen(false)}
        onCreate={handleCreateCircle}
        initialName={suggestedName}
      />
      <CircleDialog
        circle={circleForInvite}
        open={!!circleForInvite}
        onClose={() => {
          setCircleForInvite(null);
          refresh();
        }}
      />
    </section>
  );
}

function rows(
  onboarding: OnboardingState,
  handlers?: { onCreateCircle: () => void; onInvite: () => void; onWritePost: () => void },
): Row[] {
  return [
    { key: "account", label: "Create an account", done: true },
    {
      key: "circle",
      label: "Create your first circle",
      done: onboarding.hasCircle,
      action: handlers && { label: "Create", onClick: handlers.onCreateCircle },
    },
    {
      key: "invite",
      label: "Add friends already on Rogha — invite links are coming soon",
      done: onboarding.hasInvitedSomeone,
      action:
        onboarding.hasCircle && handlers
          ? { label: "Add friends", onClick: handlers.onInvite }
          : undefined,
    },
    {
      key: "post",
      label: "Write your first post",
      done: false,
      action: handlers && { label: "Write", onClick: handlers.onWritePost },
    },
  ];
}
