'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Asset, Project } from '@/types';

interface StoreState {
  assets: Asset[];
  projects: Project[];
  activeProjectId: string | null;

  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  removeAsset: (id: string) => void;

  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;

  getProjectAssets: (projectId: string) => Asset[];
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      assets: [],
      projects: [],
      activeProjectId: null,

      addAsset: (asset) =>
        set((state) => ({ assets: [asset, ...state.assets] })),

      updateAsset: (id, updates) =>
        set((state) => ({
          assets: state.assets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      removeAsset: (id) =>
        set((state) => ({ assets: state.assets.filter((a) => a.id !== id) })),

      addProject: (project) =>
        set((state) => ({ projects: [project, ...state.projects] })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      removeProject: (id) =>
        set((state) => ({ projects: state.projects.filter((p) => p.id !== id) })),

      setActiveProject: (id) => set({ activeProjectId: id }),

      getProjectAssets: (projectId) =>
        get().assets.filter((a) => a.projectId === projectId),
    }),
    {
      name: 'ai-hub-store',
      skipHydration: true,
    }
  )
);
