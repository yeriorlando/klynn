import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getCurrentUser, type Empleado, type Tenant, seedDemoIfEmpty } from "@/lib/storage";

/** Hook que devuelve el usuario actual o redirige a /login. Lectura síncrona desde localStorage. */
export function useRequireAuth(): { empleado: Empleado; tenant: Tenant } | null {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ empleado: Empleado; tenant: Tenant } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const u = await getCurrentUser();
      if (!u) {
        navigate({ to: "/login" });
      } else {
        setUser(u);
      }
      setLoading(false);
    }
    check();
  }, [navigate]);

  if (loading) return null;
  return user;
}
