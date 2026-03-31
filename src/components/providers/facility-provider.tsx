/**
 * FacilityProvider.tsx
 * Context provider for managing the currently selected facility across the app.
 * This allows components like the sidebar, charts, and tables to access the selected facility ID without prop drilling
 * (e.g., passing it through multiple layers of components).
 */

"use client";

import { createContext, useContext, useState } from "react";

interface FacilityContextValue {
  facilityId: string | null;
  setFacilityId: (id: string | null) => void;
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
}

const FacilityContext = createContext<FacilityContextValue>({
  facilityId: null,
  setFacilityId: () => {},
  selectedAssetId: null,
  setSelectedAssetId: () => {},
});

export function FacilityProvider({ children }: { children: React.ReactNode }) {
  const [facilityId, setFacilityIdState] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const setFacilityId = (id: string | null) => {
    setFacilityIdState(id);
    setSelectedAssetId(null); // Clear asset selection when switching facilities
  };

  return (
    <FacilityContext.Provider value={{ facilityId, setFacilityId, selectedAssetId, setSelectedAssetId }}>
      {children}
    </FacilityContext.Provider>
  );
}

export function useFacility() {
  return useContext(FacilityContext);
}