"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type UIStore = {
  sidebarCollapsed: boolean;
  theme: "light" | "dark" | "system";
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  setTheme: (t: "light" | "dark" | "system") => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: "light",
      commandPaletteOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setTheme: (t) => set({ theme: t }),
      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),
    }),
    { name: "crm-ui" },
  ),
);
