type StatusBand = "ACTIVE" | "SLIPPING" | "DORMANT" | "NEVER_ACTIVATED" | "ONBOARDING";

const STYLE: Record<StatusBand, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  SLIPPING: "bg-amber-100 text-amber-800",
  DORMANT: "bg-red-100 text-red-700",
  NEVER_ACTIVATED: "bg-gray-100 text-gray-600",
  ONBOARDING: "bg-blue-50 text-blue-700",
};

const LABEL: Record<StatusBand, string> = {
  ACTIVE: "Active",
  SLIPPING: "Slipping",
  DORMANT: "Dormant",
  NEVER_ACTIVATED: "Never activated",
  ONBOARDING: "New",
};

export function StatusPill({ status }: { status: StatusBand }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${STYLE[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}
