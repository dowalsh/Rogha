"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

// "What to write" help — available at any compose moment, not just the
// first post. docs/specs/2026-09-19-first-run-onboarding.md.
export function FirstPostHelpSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif">What should I write?</SheetTitle>
        </SheetHeader>

        <div className="mt-2 space-y-4 text-sm">
          {/* TODO: replace with the creator's actual voice/copy pass. */}
          <p className="text-muted-foreground italic">
            Honestly? Whatever you'd tell your friends over a drink. Nobody's
            grading this — it's just going to the people you picked.
          </p>

          <div>
            <p className="font-medium mb-1">A few things people actually write:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>A quick review of a book you just finished</li>
              <li>A small life update — what's new, what's on your mind</li>
              <li>A satirical dispatch from a made-up local festival</li>
            </ul>
          </div>

          <p className="text-muted-foreground">
            Short is good. A shared journal for your friends is one of the
            best uses of Rogha — you don't need a thesis, just something
            real. Have fun with it.
          </p>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Got it
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
