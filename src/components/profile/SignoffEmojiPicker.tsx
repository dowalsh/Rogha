"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const STARTER_SIGNOFF_EMOJI = [
  "📝", "✍️", "🖋️", "📓", "📔", "📕", "📗", "📘", "📙", "📖",
  "📚", "📰", "🗞️", "🪶", "📜",
  "💭", "💡", "🧠", "🤔", "🧐", "💬", "🗯️", "👁️", "🔍", "🧩", "🪞",
  "🎭", "🎨", "🎬", "🎼", "🖼️", "🪄",
  "✨", "🔥", "🎉", "👏", "🙌", "💯", "🚀", "🌟", "😎", "🥳",
  "😄", "🤩", "🥹", "🙏", "👍", "💪", "🫡",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💗",
  "💖", "🥰", "😍", "🫶", "🤗",
  "🤣", "😏", "🙃", "😜", "🫠", "💀", "🤪",
  "👀", "🌙", "🕯️", "☕️", "🍂", "🌧️", "🌊", "🍃", "🌿", "🌸",
  "🌻", "🍁",
  "📣", "🔔", "⚡️", "💥", "🎯", "🏆", "🥇", "🔓", "🎁",
  "🐶", "🐱", "🦊", "🐻", "🐼", "🐨", "🦁", "🐯", "🐸", "🐙",
  "🦉", "🐝", "🦋", "🐢", "🦄",
];

type Props = {
  value: string;
  onSelect: (emoji: string | null) => void | Promise<void>;
  disabled?: boolean;
};

export function SignoffEmojiPicker({ value, onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  async function handlePick(emoji: string | null) {
    setPending(emoji ?? "__remove__");
    try {
      await onSelect(emoji);
      setOpen(false);
    } finally {
      setPending(null);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          disabled={disabled}
        >
          {value ? (
            <>
              <span className="text-base">{value}</span> Signoff emoji
            </>
          ) : (
            "Add a signoff emoji"
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Shown on the notification sent to friends when you submit a post
          </p>
          {value && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 shrink-0 px-2 text-xs"
              onClick={() => handlePick(null)}
              disabled={pending !== null}
            >
              {pending === "__remove__" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <X className="h-3 w-3" /> Remove
                </>
              )}
            </Button>
          )}
        </div>
        <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto">
          {STARTER_SIGNOFF_EMOJI.map((emoji) => (
            <button
              key={emoji}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md text-lg transition-colors hover:bg-accent",
                value === emoji && "bg-accent"
              )}
              onClick={() => handlePick(emoji)}
              disabled={pending !== null}
              aria-label={`Set signoff emoji to ${emoji}`}
            >
              {pending === emoji ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                emoji
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
