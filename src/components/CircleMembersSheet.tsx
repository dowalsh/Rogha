"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

type Member = { id: string; username: string; image: string | null };

function initialsFor(username: string) {
  return username.slice(0, 2).toUpperCase();
}

// Read-only member list, bottom sheet — shared by the composer's audience
// picker and the comments-section circle pill so both show the exact same
// "who's in this" popup.
export function CircleMembersSheet({
  target,
  onClose,
}: {
  target: { title: string; members: Member[] } | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!target} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif">
            {target?.title}, {target?.members.length}{" "}
            {target?.members.length === 1 ? "person" : "people"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-2 divide-y divide-border">
          {target?.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={m.image ?? undefined} alt={m.username} />
                <AvatarFallback>{initialsFor(m.username)}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{m.username}</span>
            </div>
          ))}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
