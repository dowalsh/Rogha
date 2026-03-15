import { Spinner } from "@/components/Spinner";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
