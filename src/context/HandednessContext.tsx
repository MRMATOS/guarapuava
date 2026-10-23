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

export const HandednessProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Inicializa sempre como 'right' para que o primeiro render do cliente coincida perfeitamente com o SSR
  const [handedness, setHandednessState] = useState<Handedness>("right");

  // Lê a preferência salva após a montagem do cliente para evitar qualquer divergência de hidratação
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Handedness | null;
      if (saved === "right" || saved === "left") {
        setHandednessState(saved);
      }
    } catch {
      // Ignora falhas de leitura em ambientes restritos
    }
  }, []);

  // Sincroniza o atributo no DOM e no localStorage quando o modo é alterado
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
