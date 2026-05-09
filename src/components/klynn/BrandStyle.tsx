import { useEffect } from "react";
import type { Tenant } from "@/lib/storage";

/** Aplica los colores del tenant como CSS variables overrideando --primary y derivados. */
export function BrandStyle({ tenant }: { tenant: Tenant }) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", tenant.color_primario);
    root.style.setProperty("--brand-secondary", tenant.color_secundario);
    const useSecondary = tenant.config?.usar_color_secundario ?? false;
    // override semantic primary so todos los botones/badges usan la marca
    root.style.setProperty("--primary", tenant.color_primario);
    root.style.setProperty("--primary-glow", useSecondary ? tenant.color_secundario : tenant.color_primario);
    root.style.setProperty("--ring", tenant.color_primario);
    return () => {
      root.style.removeProperty("--brand-primary");
      root.style.removeProperty("--brand-secondary");
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-glow");
      root.style.removeProperty("--ring");
    };
  }, [tenant.color_primario, tenant.color_secundario]);
  return null;
}
