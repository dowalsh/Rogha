"use client";

import { useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/Spinner";
import { SettingsSkeleton } from "@/components/settings/SettingsSkeleton";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { Check, Info } from "lucide-react";
import toast from "react-hot-toast";
import { mutate } from "swr";
import { WeeklyJamExplainer } from "@/components/jam/WeeklyJamExplainer";

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

type JamPrefs = { lastfmUsername: string | null; jamEnabled: boolean };

export function ProfileSettingsTab() {
  const { openUserProfile } = useClerk();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const [jam, setJam] = useState<JamPrefs | null>(null);
  const [lastfmInput, setLastfmInput] = useState("");
  const [jamSaveStatus, setJamSaveStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((data) => setPrefs(data))
      .catch(() => toast.error("Failed to load preferences"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/settings/jam")
      .then((r) => r.json())
      .then((data: JamPrefs) => {
        setJam(data);
        setLastfmInput(data.lastfmUsername ?? "");
      })
      .catch(() => toast.error("Failed to load Weekly Jam settings"));
  }, []);

  async function saveJam(next: Partial<JamPrefs>) {
    if (!jam) return;
    const merged = { ...jam, ...next };
    setJam(merged);
    setJamSaveStatus("saving");
    try {
      const res = await fetch("/api/settings/jam", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error();
      setJamSaveStatus("saved");
      mutate("/api/me");
    } catch {
      setJam(jam);
      setJamSaveStatus("idle");
      toast.error("Failed to save");
    }
  }

  function handleSaveLastfmUsername() {
    const trimmed = lastfmInput.trim();
    if (!trimmed) {
      toast.error("Enter a Last.fm username");
      return;
    }
    // Saving a username is the whole "connect" action — turn Jam on in the
    // same request rather than making it a separate step.
    saveJam({ lastfmUsername: trimmed, jamEnabled: true });
  }

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
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-base">Connect your Music</CardTitle>
            <WeeklyJamExplainer
              trigger={
                <button
                  type="button"
                  aria-label="What is Weekly Jam?"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Info className="h-4 w-4" />
                </button>
              }
            />
          </div>
          {jamSaveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Spinner className="h-3 w-3" /> Saving…
            </span>
          )}
          {jamSaveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {jam && (
            <>
              <div className="space-y-2">
                <label htmlFor="lastfm-username" className="text-sm font-medium">
                  Last.fm username
                </label>
                <div className="flex gap-2">
                  <Input
                    id="lastfm-username"
                    placeholder="your-lastfm-username"
                    value={lastfmInput}
                    onChange={(e) => setLastfmInput(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={handleSaveLastfmUsername}
                    disabled={lastfmInput.trim() === (jam.lastfmUsername ?? "")}
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Show my Weekly Jam</span>
                <Switch
                  checked={jam.jamEnabled}
                  disabled={!jam.lastfmUsername}
                  onCheckedChange={(v) => saveJam({ jamEnabled: v })}
                />
              </div>
              {!jam.lastfmUsername && (
                <p className="text-xs text-muted-foreground">
                  Save a Last.fm username to turn this on.
                </p>
              )}
            </>
          )}
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
          <Button variant="outline" size="sm" onClick={() => openUserProfile()}>
            Manage Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
