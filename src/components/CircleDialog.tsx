"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { X, UserPlus, LogOut, Check } from "lucide-react";
import {
  addMemberToCircle,
  removeMemberFromCircle,
  leaveCircle,
} from "@/actions/circle.action";
import { getFriends } from "@/actions/friends.action";

export function CircleDialog({
  circle,
  open,
  onClose,
}: {
  circle: any;
  open: boolean;
  onClose: () => void;
}) {
  if (!circle?.members || circle.members.length === 0) return null;

  const [members, setMembers] = useState<{ user: any }[]>(circle.members);
  const [friends, setFriends] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // 🧩 new state just for Popover
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    getFriends().then(setFriends);
  }, []);

  const handleRemove = async (memberId: string) => {
    await removeMemberFromCircle(circle.id, memberId);
    setMembers((prev) => prev.filter((m) => m.user.id !== memberId));
  };

  const handleAdd = async (friendId: string) => {
    setIsAdding(true);
    try {
      await addMemberToCircle({ circleId: circle.id, friendId });
      const friend = friends.find((f) => f.id === friendId);
      setMembers((prev) => [...prev, { user: friend }]);
      setIsPopoverOpen(false); // ✅ close just the popover, not the dialog
    } finally {
      setIsAdding(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Leave this circle?")) return;
    await leaveCircle(circle.id);
    onClose();
  };

  const currentMemberIds = members.map((m) => m.user.id);
  const addableFriends = friends.filter(
    (f) => !currentMemberIds.includes(f.id)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{circle.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Members */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Members</h3>

              {/* 🧩 friend picker popover now has its own open state */}
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-64">
                  <Command>
                    <CommandInput placeholder="Search friends..." />
                    <CommandEmpty>No friends found</CommandEmpty>
                    <CommandGroup>
                      {addableFriends.map((friend) => (
                        <CommandItem
                          key={friend.id}
                          onSelect={() => handleAdd(friend.id)}
                          disabled={isAdding}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={friend.image} />
                              <AvatarFallback>
                                {friend.name?.[0] ?? "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span>{friend.name || friend.username}</span>
                          </div>
                          {isAdding && <Check className="w-4 h-4 ml-auto" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m.user.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={m.user.image} />
                      <AvatarFallback>{m.user.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span>{m.user.name || "Unknown"}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(m.user.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
