"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
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

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold mb-3 px-2">Your Circles</h2>
      <div className="flex overflow-x-auto py-4 gap-4 pb-2 px-2 scrollbar-none">
        {/* Create */}
        <motion.div whileHover={{ scale: 1.05 }}>
          <Card
            onClick={() => setNewDialogOpen(true)}
            className="w-40 h-40 flex flex-col items-center justify-center border-dashed border-2 hover:border-primary transition cursor-pointer"
          >
            <Plus className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm mt-2 text-muted-foreground">New Circle</p>
          </Card>
        </motion.div>

        {circles.map((circle) => (
          <motion.div key={circle.id} whileHover={{ scale: 1.03 }}>
            <Card
              onClick={() => setSelected(circle)}
              className="relative w-40 h-40 p-3 flex flex-col justify-between cursor-pointer hover:shadow-md transition"
            >
              <div>
                <h3 className="font-medium truncate">{circle.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {circle.members.length} members
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <CircleDialog
        circle={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
      <NewCircleDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        onCreate={handleCreate}
      />
    </section>
  );
}
