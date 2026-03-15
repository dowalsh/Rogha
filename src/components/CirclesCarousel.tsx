"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Blend } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CircleDialog } from "./CircleDialog";
import { getCirclesForUser, createCircle } from "@/actions/circle.action";
import { motion } from "framer-motion";
import { NewCircleDialog } from "./NewCircleDialog";

export function CirclesCarousel() {
  const [circles, setCircles] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  useEffect(() => {
    getCirclesForUser().then(setCircles);
  }, []);

  const handleCreate = async (name: string, description?: string) => {
    const newCircle = await createCircle({ name, description });
    setCircles((prev) => [newCircle, ...prev]);
  };

  // When the dialog reports membership changed, update circles + selected
  const handleMembersChanged = (nextMembers: { user: any }[]) => {
    if (!selected) return;
    setCircles((prev) =>
      prev.map((c) =>
        c.id === selected.id ? { ...c, members: nextMembers } : c
      )
    );
    setSelected((prev: any) =>
      prev ? { ...prev, members: nextMembers } : prev
    );
  };

  return (
    <section className="rounded-md border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Blend className="h-5 w-5" />
          Circles
        </h2>
      </div>
      <div className="flex flex-wrap gap-4 py-2 overflow-y-auto">
        {/* Create */}
        <motion.div whileHover={{ scale: 1.05 }}>
          <Card
            onClick={() => setNewDialogOpen(true)}
            className="w-32 h-32 flex flex-col items-center justify-center border-dashed border-2 hover:border-primary transition cursor-pointer rounded-full"
          >
            <Plus className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm mt-2 text-muted-foreground">New Circle</p>
          </Card>
        </motion.div>

        {circles.map((circle) => (
          <motion.div key={circle.id} whileHover={{ scale: 1.03 }}>
            <Card
              onClick={() => setSelected(circle)}
              className="relative w-32 h-32 p-3 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition rounded-full"
            >
              <div className="text-center">
                <h3 className="font-medium text-sm leading-tight">{circle.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {circle.members.length} members
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <CircleDialog
        key={selected?.id ?? "none"} // keep open after mutations
        circle={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onMembersChanged={handleMembersChanged} // renamed prop
      />
      <NewCircleDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        onCreate={handleCreate}
      />
    </section>
  );
}
