"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { Check, ChevronDown } from "lucide-react";
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

  const refresh = () =>
    mutate((key) => typeof key === "string" && key.startsWith("/api/home"));

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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <p className="font-serif text-xl truncate">Welcome to Rogha!</p>
          {collapsed && (
            <div className="flex items-center gap-1.5 shrink-0">
              {items.map((row) => (
                <span
                  key={row.key}
                  title={row.label}
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    row.done
                      ? "bg-foreground text-background border-foreground"
                      : "text-transparent"
                  }`}
                >
                  <Check className="h-3 w-3" />
                </span>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => toggleCollapsed(!collapsed)}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${collapsed ? "-rotate-90" : ""}`}
          />
        </Button>
      </div>

      {!collapsed && (
        <>
          <ul className="space-y-2">
            {items.map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      row.done
                        ? "bg-foreground text-background border-foreground"
                        : "text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span
                    className={`text-sm truncate ${row.done ? "text-muted-foreground line-through" : ""}`}
                  >
                    {row.label}
                  </span>
                </div>
                {row.action && !row.done && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={row.action.onClick}
                  >
                    {row.action.label}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
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
  handlers?: {
    onCreateCircle: () => void;
    onInvite: () => void;
    onWritePost: () => void;
  },
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
      label: "Invite people to your circle",
      done: onboarding.hasInvitedSomeone,
      action:
        onboarding.hasCircle && handlers
          ? { label: "Invite", onClick: handlers.onInvite }
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
