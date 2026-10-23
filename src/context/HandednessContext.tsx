"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Handedness = "right" | "left";

export interface HandednessContextType {
  handedness: Handedness;
  isLeftHanded: boolean;
  toggleHandedness: () => void;
  setHandedness: (mode: Handedness) => void;
}

const HandednessContext = createContext<HandednessContextType | undefined>(undefined);

const STORAGE_KEY = "guarapuava:handedness";

function getInitialHandedness(): Handedness {
  if (typeof window === "undefined") return "right";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Handedness | null;
    if (saved === "right" || saved === "left") {
      return saved;
    }
    return "right";
  } catch {
    return "right";
  }
}

export const HandednessProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [handedness, setHandednessState] = useState<Handedness>(getInitialHandedness);

  // Sincroniza o atributo no DOM e no localStorage
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-handedness", handedness);
    try {
      localStorage.setItem(STORAGE_KEY, handedness);
    } catch {
      // Ignora falhas de gravação em storage privado/restrito
    }
  }, [handedness]);

  const setHandedness = (mode: Handedness) => {
    setHandednessState(mode);
  };

  const toggleHandedness = () => {
    setHandednessState((prev) => (prev === "left" ? "right" : "left"));
  };

  const isLeftHanded = handedness === "left";

  return (
    <HandednessContext.Provider
      value={{
        handedness,
        isLeftHanded,
        toggleHandedness,
        setHandedness,
      }}
    >
      {children}
    </HandednessContext.Provider>
  );
};

export function useHandedness(): HandednessContextType {
  const context = useContext(HandednessContext);
  if (!context) {
    throw new Error("useHandedness deve ser usado dentro de um HandednessProvider");
  }
  return context;
}
