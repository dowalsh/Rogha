// save-state.ts
export type SaveState = {
  saving: boolean;
  dirty: boolean;
  conflict: boolean;
  error: string | null;
};
