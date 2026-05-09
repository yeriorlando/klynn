import { useEffect } from "react";
import { seedDemoIfEmpty } from "@/lib/storage";

/** Inicializa datos demo en localStorage en el primer render del cliente. */
export function SeedBootstrap() {
  useEffect(() => {
    seedDemoIfEmpty();
  }, []);
  return null;
}
