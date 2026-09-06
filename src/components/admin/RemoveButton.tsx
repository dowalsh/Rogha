export function RemoveButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded px-2 py-1 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40 transition-colors"
    >
      Remove
    </button>
  );
}
