"use client";

import { useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";
import { normalizeImage } from "@/lib/images";
import toast from "react-hot-toast";

type Props = {
  image: string | null;
  username: string | null;
  size?: number; // px, defaults to 96
};

function initialsFor(username: string | null) {
  return (username || "?").slice(0, 2).toUpperCase();
}

// Own-profile-only control: click the avatar to replace it. Writes straight
// to User.image server-side (see avatarUploader in
// src/app/api/uploadthing/core.ts); refreshes the shared "/api/me" cache so
// every consumer (nav, nudge, etc.) picks up the new image immediately.
export function AvatarUploadButton({ image, username, size = 96 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { mutate } = useSWRConfig();

  const { startUpload, isUploading } = useUploadThing("avatarUploader", {
    onClientUploadComplete: (res) => {
      const url = res?.[0]?.ufsUrl;
      if (url) {
        setPreviewUrl(url);
        void mutate("/api/me");
        toast.success("Avatar updated");
      }
    },
    onUploadError: (err: Error) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const normalized = await Promise.all(files.map(normalizeImage));
    await startUpload(normalized);
    e.target.value = "";
  }

  const displayImage = previewUrl ?? image;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="group relative rounded-full disabled:opacity-70"
        style={{ width: size, height: size }}
        title="Change avatar"
      >
        <Avatar style={{ width: size, height: size }}>
          <AvatarImage src={displayImage ?? undefined} alt={username ?? "Avatar"} />
          <AvatarFallback style={{ fontSize: size / 2.5 }}>
            {initialsFor(username)}
          </AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 group-hover:bg-black/40 transition-colors">
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <Camera className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </button>
    </>
  );
}
