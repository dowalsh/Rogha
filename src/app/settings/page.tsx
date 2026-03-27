"use client";

import { useEffect, useState } from "react";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/Spinner";
import toast from "react-hot-toast";

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

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPrefs({ ...prefs });
      toast.error("Failed to save");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Spinner />
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <>
      <SignedOut>
        <RedirectToSignIn signInFallbackRedirectUrl="/settings" />
      </SignedOut>
      <SignedIn>
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
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
    </div>
      </SignedIn>
    </>
  );
}
