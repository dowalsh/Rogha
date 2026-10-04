"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Blend } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { Card } from "@/components/ui/card";
import { getCirclesForUser, createCircle } from "@/actions/circle.action";
import { motion } from "framer-motion";
import { NewCircleDialog } from "./NewCircleDialog";
import { CirclePill } from "@/components/circles/CirclePill";

export function CirclesCarousel() {
  const router = useRouter();
  const [circles, setCircles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  useEffect(() => {
    getCirclesForUser().then((data) => {
      setCircles(data);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (name: string, description?: string) => {
    const newCircle = await createCircle({ name, description });
    setCircles((prev) => [newCircle, ...prev]);
    router.push(`/circles/${newCircle.id}`);
  };

  return (
    <section className="rounded-md border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Blend className="h-5 w-5" />
          Circles
        </h2>
      </div>
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : (
      <div className="flex flex-wrap gap-4 py-2 overflow-y-auto justify-center">
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
              onClick={() => router.push(`/circles/${circle.id}`)}
              className="relative w-32 h-32 p-3 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition rounded-full"
            >
              <div className="text-center">
                <CirclePill name={circle.name} />
                <p className="text-xs text-muted-foreground mt-1">
                  {circle.members.length} members
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      )}

      <NewCircleDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        onCreate={handleCreate}
      />
    </section>
  );
}
