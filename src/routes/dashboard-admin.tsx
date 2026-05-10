import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Building2, TrendingUp, Package, ExternalLink, ArrowRight, LayoutDashboard, LogOut, Shield, RefreshCw } from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { 
  getTenantsForUser, 
  getOrdenes, 
  formatRD, 
  setActiveTenant,
  setSession,
  logout,
  type Tenant 
} from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard-admin")({
  head: () => ({ meta: [{ title: "Mis Lavanderías — Klynn" }] }),
  component: DashboardAdminPage,
});

function DashboardAdminPage() {
  const auth = useRequireAuth();
  const navigate = useNavigate();
  const [myTenants, setMyTenants] = useState<Tenant[]>([]);
  const [tenantStats, setTenantStats] = useState<Record<string, { count: number; total: number }>>({}); 
  const [stats, setStats] = useState({ totalIngresos: 0, totalOrdenesCount: 0, activasCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!auth?.empleado.email || auth.empleado.id === '__loading__') return;
      setLoading(true);
      const tenants = await getTenantsForUser(auth.empleado.email);
      setMyTenants(tenants);

      let totalIngresos = 0, totalOrdenesCount = 0, activasCount = 0;
      const tStats: Record<string, { count: number; total: number }> = {};
        for (const t of tenants) {
          const ords = await getOrdenes(t.id);
          const ordsArr = Array.isArray(ords) ? ords : [];
          const ingr = ordsArr.reduce((s, o) => s + (o.total || 0), 0);
          tStats[t.id] = { count: ordsArr.length, total: ingr };
          totalIngresos += ingr;
          totalOrdenesCount += ordsArr.length;
        if (t.estado !== "CANCELADO") activasCount++;
      }
      setTenantStats(tStats);
      setStats({ totalIngresos, totalOrdenesCount, activasCount });
      setLoading(false);
    }
    load();
  }, [auth?.empleado.email]);

  function handleManage(tenantId: string, slug: string) {
    setSession({ empleado_id: auth?.empleado.id || 'admin', tenant_id: tenantId, iniciado_en: new Date().toISOString() });
    setActiveTenant(slug);
    toast.success(`Entrando a ${slug}...`);
    setTimeout(() => window.location.assign(`/t/${slug}`), 500);
  }

  function handleLogout() {
    logout();
    navigate({ to: "/login" });
  }

  if (!auth || auth.empleado.id === '__loading__') return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header replicado de admin.tsx */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="outline" className="border-primary/20 bg-primary/10">
              <Shield className="mr-1 h-3 w-3" /> Panel Propietario
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={handleLogout} 
              className="h-9 px-4 rounded-lg font-bold shadow-md hover:opacity-90 transition-all"
            >
              <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-tight">Panel central de Propietario</h1>
            <p className="mt-1 text-muted-foreground">Administra tus lavanderías registradas en Klynn.</p>
          </div>
          <Link to="/nueva-sucursal">
            <Button className="bg-primary text-white hover:bg-primary/90 h-9 px-5 rounded-lg shadow-md transition-all active:scale-95 font-bold">
              <Building2 className="mr-2 h-4 w-4" /> Registrar nueva sucursal
            </Button>
          </Link>
        </div>

        {/* KPIs replicados de admin.tsx */}
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <KPI t="Lavanderías" v={String(myTenants.length)} icon={Building2} />
          <KPI t="Activas" v={String(stats.activasCount)} icon={Building2} />
          <KPI t="Ingresos Totales" v={formatRD(stats.totalIngresos)} icon={TrendingUp} accent />
          <KPI t="Órdenes Totales" v={String(stats.totalOrdenesCount)} icon={Package} />
        </div>

        {/* Tabla replicada de admin.tsx */}
        <Card className="mt-10 overflow-hidden border-none shadow-card">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-xl">Lavanderías registradas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Marca</th>
                  <th className="px-4 py-3 text-left">Slug</th>
                  <th className="px-4 py-3 text-right">Órdenes</th>
                  <th className="px-4 py-3 text-right">Ingresos</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {myTenants.map((t) => {
                  const ts = tenantStats[t.id] || { count: 0, total: 0 };
                  return (
                    <tr key={t.id} className="border-b border-border/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span 
                            className="h-7 w-7 rounded-md" 
                            style={{ background: `linear-gradient(135deg, ${t.color_primario}, ${t.color_secundario})` }} 
                          />
                          <div>
                            <div className="font-medium">{t.nombre}</div>
                            <div className="text-xs text-muted-foreground">{t.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-primary">klynn.com.do/t/{t.slug}</td>
                      <td className="px-4 py-3 text-right">{ts.count}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatRD(ts.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleManage(t.id, t.slug)}
                            className="h-9 px-4 rounded-lg border-primary/20 text-primary hover:bg-primary hover:text-white transition-all group font-bold"
                          >
                            Ver sucursal <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {myTenants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      No tienes lavanderías registradas aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}

function KPI({ t, v, icon: Icon, accent }: { t: string; v: string; icon: any; accent?: boolean }) {
  return (
    <Card className={`border-none p-5 shadow-card ${accent ? "bg-gradient-primary text-white" : ""}`}>
      <div className="flex items-start justify-between">
        <div className={`text-xs uppercase ${accent ? "text-white/80" : "text-muted-foreground"}`}>{t}</div>
        <Icon className={`h-4 w-4 ${accent ? "text-white/80" : "text-muted-foreground"}`} />
      </div>
      <div className="mt-2 font-display text-3xl">{v}</div>
    </Card>
  );
}
