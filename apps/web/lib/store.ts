// Global UI state (Zustand). Kept minimal — server data is fetched per-page;
// this holds cross-cutting UI concerns like the active company and toasts.
import { create } from "zustand";

interface Toast {
  id: number;
  message: string;
  kind: "info" | "success" | "error";
}

interface UIState {
  activeCompanyId: number | null;
  setActiveCompany: (id: number | null) => void;

  commandOpen: boolean;
  toggleCommand: (open?: boolean) => void;

  toasts: Toast[];
  pushToast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 1;

export const useUI = create<UIState>((set) => ({
  activeCompanyId: null,
  setActiveCompany: (id) => set({ activeCompanyId: id }),

  commandOpen: false,
  toggleCommand: (open) =>
    set((s) => ({ commandOpen: open ?? !s.commandOpen })),

  toasts: [],
  pushToast: (message, kind = "info") => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
