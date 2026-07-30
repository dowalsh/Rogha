"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSWRConfig } from "swr";
import { SignInButton, useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { PostPreviewRow } from "@/components/PostPreviewRow";
import { AvatarUploadButton } from "@/components/AvatarUploadButton";
import { ProfileOverflowMenu } from "@/components/ProfileOverflowMenu";
import { ProfileSettingsTab } from "@/components/profile/ProfileSettingsTab";
import { SignoffEmojiPicker } from "@/components/profile/SignoffEmojiPicker";
import { Loader2, Pencil, UserMinus, UserPlus, Check, Clock } from "lucide-react";
import type { ProfileForViewer } from "@/actions/profile.action";

type Props = {
  profile: Exclude<ProfileForViewer, { kind: "not_found" }>;
};

function initialsFor(username: string | null) {
  return (username || "?").slice(0, 2).toUpperCase();
}

function PostList({
  posts,
}: {
  posts: { id: string; title: string | null; heroThumbUrl?: string | null; createdAt: string | Date }[];
}) {
  if (posts.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No posts yet
      </div>
    );
  }
  return (
    <div className="rounded-xl border bg-background/60 p-3 sm:p-4 divide-y">
      {posts.map((post) => (
        <PostPreviewRow
          key={post.id}
          variant="plain"
          postId={post.id}
          title={post.title ?? "Untitled Post"}
          metaText={`${formatDistanceToNow(new Date(post.createdAt))} ago`}
          thumbUrl={post.heroThumbUrl}
          href={`/reader/${post.id}`}
        />
      ))}
    </div>
  );
}

export default function ProfilePageClient({ profile }: Props) {
  if (profile.kind === "self") return <SelfProfile profile={profile} />;
  if (profile.kind === "friend") return <FriendProfile profile={profile} />;
  return <StrangerProfile profile={profile} />;
}

function SelfProfile({
  profile,
}: {
  profile: Extract<ProfileForViewer, { kind: "self" }>;
}) {
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "settings" ? "settings" : "posts";

  function handleTabChange(value: string) {
    router.replace(`/profile/${profile.user.username}?tab=${value}`, { scroll: false });
  }

  const [editingField, setEditingField] = useState<"username" | null>(null);

  const [value, setValue] = useState(profile.user.username);
  const [username, setUsername] = useState(profile.user.username);
  const [saving, setSaving] = useState(false);

  const [signoffEmoji, setSignoffEmoji] = useState(profile.user.signoffEmoji ?? "");
  const [savingEmoji, setSavingEmoji] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to save username");
      setUsername(body.username);
      setEditingField(null);
      void mutate("/api/me");
      toast.success("Username updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save username");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEmoji(emoji: string | null) {
    setSavingEmoji(true);
    try {
      const res = await fetch("/api/signoff-emoji", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji: emoji ?? "" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to save signoff emoji");
      setSignoffEmoji(body.signoffEmoji ?? "");
      void mutate("/api/me");
      toast.success("Signoff emoji updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save signoff emoji");
    } finally {
      setSavingEmoji(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <AvatarUploadButton image={profile.user.image} username={profile.user.username} size={96} />

        {editingField === "username" ? (
          <div className="flex w-full max-w-xs items-center gap-2">
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="h-8 min-w-0 flex-1"
              maxLength={20}
            />
            <Button size="sm" className="shrink-0" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                setValue(username);
                setEditingField(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1.5 text-lg font-semibold hover:text-muted-foreground transition-colors"
            onClick={() => setEditingField("username")}
            disabled={editingField !== null}
          >
            {username}
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}

        <SignoffEmojiPicker
          value={signoffEmoji}
          onSelect={handleSaveEmoji}
          disabled={editingField !== null || savingEmoji}
        />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="flex justify-center">
          <TabsList>
            <TabsTrigger value="posts" className="w-24">Posts</TabsTrigger>
            <TabsTrigger value="settings" className="w-24">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="posts" forceMount>
          <PostList posts={profile.posts} />
        </TabsContent>

        <TabsContent value="settings" forceMount>
          <ProfileSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FriendProfile({
  profile,
}: {
  profile: Extract<ProfileForViewer, { kind: "friend" }>;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch(`/api/friends/${profile.user.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Removed from friends");
      router.refresh();
    } catch {
      toast.error("Failed to remove friend");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.user.image ?? undefined} alt={profile.user.username} />
            <AvatarFallback style={{ fontSize: 36 }}>{initialsFor(profile.user.username)}</AvatarFallback>
          </Avatar>
          <div className="text-lg font-semibold">{profile.user.username}</div>
        </div>
        <ProfileOverflowMenu userId={profile.user.id} username={profile.user.username} />
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={removing}>
            {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
            Remove friend
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {profile.user.username} as a friend?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll stop seeing their posts. Their shared circle memberships
              are unaffected. You can send a request again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={removing}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Posts</h2>
        <PostList posts={profile.posts} />
      </div>
    </div>
  );
}

function StrangerProfile({
  profile,
}: {
  profile: Extract<ProfileForViewer, { kind: "stranger" }>;
}) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [relationship, setRelationship] = useState(profile.relationship);
  const [acting, setActing] = useState(false);

  async function handleAddFriend() {
    setActing(true);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: profile.user.username }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 200) {
        throw new Error(body?.message || body?.error || res.statusText);
      }
      setRelationship("PENDING_OUTGOING");
      toast.success("Friend request sent");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send request");
    } finally {
      setActing(false);
    }
  }

  async function handleAccept() {
    setActing(true);
    try {
      const res = await fetch(`/api/friends/${profile.user.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.refresh();
      toast.success("Friend request accepted");
    } catch {
      toast.error("Failed to accept");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.user.image ?? undefined} alt={profile.user.username} />
            <AvatarFallback style={{ fontSize: 36 }}>{initialsFor(profile.user.username)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-lg font-semibold">{profile.user.username}</div>
            {profile.mutualCount > 0 && (
              <div className="text-sm text-muted-foreground">
                {profile.mutualCount} mutual friend{profile.mutualCount === 1 ? "" : "s"}
              </div>
            )}
          </div>
        </div>
        {isSignedIn && (
          <ProfileOverflowMenu userId={profile.user.id} username={profile.user.username} />
        )}
      </div>

      {!isSignedIn ? (
        <SignInButton mode="modal">
          <Button className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Add friend
          </Button>
        </SignInButton>
      ) : relationship === "NONE" ? (
        <Button onClick={handleAddFriend} disabled={acting} className="gap-1.5">
          {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Add friend
        </Button>
      ) : relationship === "PENDING_OUTGOING" ? (
        <Button variant="secondary" disabled className="gap-1.5">
          <Clock className="h-4 w-4" />
          Request pending
        </Button>
      ) : (
        <Button onClick={handleAccept} disabled={acting} className="gap-1.5">
          {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Accept request
        </Button>
      )}
    </div>
  );
}
