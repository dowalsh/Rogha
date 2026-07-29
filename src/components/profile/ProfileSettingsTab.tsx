"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";
import { SettingsSkeleton } from "@/components/settings/SettingsSkeleton";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { Check, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { getClerkAccountPortalUrl } from "@/lib/clerkAccountPortal";

type Prefs = {
  emailEnabled: boolean;
  pushEnabled: boolean;
  emailComments: boolean;
  pushComments: boolean;
  emailReplies: boolean;
  pushReplies: boolean;
  emailSubmissions: boolean;
  pushSubmissions: boolean;
  emailFriendRequests: boolean;
  pushFriendRequests: boolean;
};

const rows: { label: string; email: keyof Prefs; push: keyof Prefs }[] = [
  { label: "Comments on my posts", email: "emailComments", push: "pushComments" },
  { label: "Replies in threads", email: "emailReplies", push: "pushReplies" },
  { label: "New post submissions", email: "emailSubmissions", push: "pushSubmissions" },
  { label: "Friend requests", email: "emailFriendRequests", push: "pushFriendRequests" },
];

type SaveStatus = "idle" | "saving" | "saved";

async function openAccountPortal() {
  const url = getClerkAccountPortalUrl();
  if (!url) {
    toast.error("Account management isn't available right now.");
    return;
  }
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url, presentationStyle: "popover" });
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function ProfileSettingsTab() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((data) => setPrefs(data))
      .catch(() => toast.error("Failed to load preferences"))
      .finally(() => setIsLoading(false));
  }, []);

  async function toggle(field: keyof Prefs, value: boolean) {
    if (!prefs) return;
    setPrefs({ ...prefs, [field]: value });
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
      setSaveStatus("saved");
    } catch {
      setPrefs({ ...prefs });
      setSaveStatus("idle");
      toast.error("Failed to save");
    }
  }

  const showSkeleton = useDelayedLoading(isLoading);

  if (showSkeleton) {
    return <SettingsSkeleton />;
  }

  if (isLoading || !prefs) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Notifications</CardTitle>
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Spinner className="h-3 w-3" /> Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 px-6 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span />
            <span className="w-10 text-center">Email</span>
            <span className="w-10 text-center">Push</span>
          </div>

          {/* Master toggles */}
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-6 py-3">
            <span className="text-sm font-medium">All notifications</span>
            <div className="w-10 flex justify-center">
              <Switch
                checked={prefs.emailEnabled}
                onCheckedChange={(v) => toggle("emailEnabled", v)}
              />
            </div>
            <div className="w-10 flex justify-center">
              <Switch
                checked={prefs.pushEnabled}
                onCheckedChange={(v) => toggle("pushEnabled", v)}
              />
            </div>
          </div>

          <Separator />

          {/* Per-type rows */}
          {rows.map((row) => (
            <div
              key={row.email}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-6 py-3"
            >
              <span className={`text-sm ${!prefs.emailEnabled && !prefs.pushEnabled ? "text-muted-foreground" : ""}`}>
                {row.label}
              </span>
              <div className="w-10 flex justify-center">
                <Switch
                  checked={prefs[row.email] as boolean}
                  onCheckedChange={(v) => toggle(row.email, v)}
                  disabled={!prefs.emailEnabled}
                />
              </div>
              <div className="w-10 flex justify-center">
                <Switch
                  checked={prefs[row.push] as boolean}
                  onCheckedChange={(v) => toggle(row.push, v)}
                  disabled={!prefs.pushEnabled}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Change your password, email, or review active sessions.
          </p>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={openAccountPortal}>
            Manage account
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <p className="text-xs text-muted-foreground">
            Opens in your browser — this is handled by our sign-in provider, separate from the app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
