import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { ExportAndPrintButtons } from "@/components/klynn/ExportAndPrintButtons";
import { Card } from "@/components/ui/card";
import { getOrdenes, getGastos, getEmpleados, getMovimientos, formatRD, type Orden, type Gasto, type Empleado, type MovimientoCaja } from "@/lib/storage";

export const Route = createFileRoute("/t/$slug/reportes")({ component: ReportesPage });

function ReportesPage() {
  const user = useRequireAuth();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [emps, setEmps] = useState<Empleado[]>([]);
  const [movs, setMovs] = useState<MovimientoCaja[]>([]);
  const [loading, setLoading] = useState(true);

  const tenant = user?.tenant;

  useEffect(() => {
    async function load() {
      if (!tenant || tenant.id === '__loading__') return;
      setLoading(true);
      const [oList, gList, eList, mList] = await Promise.all([
        getOrdenes(tenant.id),
        getGastos(tenant.id),
        getEmpleados(tenant.id),
        getMovimientos(tenant.id)
      ]);
      setOrdenes(oList.filter((o) => o.estado !== "ANULADA"));
      setGastos(gList);
      setEmps(eList);
      setMovs(mList);
      setLoading(false);
    }
    load();
  }, [tenant?.id]);

  const stats = useMemo(() => {
    const ventas = ordenes.reduce((s, o) => s + o.total, 0);
    const itbis = ordenes.reduce((s, o) => s + o.itbis, 0);
    
    // Sumar gastos manuales + gastos de caja chica desde movimientos
    const gastosManuales = gastos.filter(g => !g.is_caja_chica).reduce((s, g) => s + g.monto, 0);
    const gastosCajaChica = movs.filter(m => m.tipo === "GASTO_CAJA_CHICA").reduce((s, m) => s + m.monto, 0);
    
    const totalGastos = gastosManuales + gastosCajaChica;
    const rentabilidad = ventas - totalGastos;

    const porMetodo = ordenes.reduce((m, o) => { 
      m[o.metodo_pago] = (m[o.metodo_pago] || 0) + o.total; 
      return m; 
    }, {} as Record<string, number>);

    const porEmp = emps.map((e) => ({ 
      nombre: e.nombre, 
      total: ordenes.filter((o) => o.empleado_id === e.id).reduce((s, o) => s + o.total, 0), 
      n: ordenes.filter((o) => o.empleado_id === e.id).length 
    })).sort((a, b) => b.total - a.total);

    const prendas: Record<string, number> = {};
    ordenes.forEach((o) => o.items.forEach((it) => { 
      prendas[it.descripcion] = (prendas[it.descripcion] || 0) + it.cantidad; 
    }));
    const topPrendas = Object.entries(prendas).sort((a, b) => b[1] - a[1]).slice(0, 8);

    return { ventas, itbis, totalGastos, rentabilidad, porMetodo, porEmp, topPrendas };
  }, [ordenes, gastos, emps]);

  const { ventas, itbis, totalGastos, rentabilidad, porMetodo, porEmp, topPrendas } = stats;

  if (!user || user.tenant.id === '__loading__') return null;

  if (loading) return <div className="flex h-64 items-center justify-center"><p className="text-muted-foreground animate-pulse">Cargando reportes...</p></div>;

  return (
    <div>
      <PageHeader title="Reportes y estadísticas" description="Visualiza el rendimiento de tu lavandería.">
        <ExportAndPrintButtons 
          filename="Reporte_General" 
          printTitle="Reportes y estadísticas"
          tenant={tenant}
          columns={["Métrica / Categoría", "Valor Registrado"]}
          data={[
            ["Ventas totales", formatRD(ventas)],
            ["ITBIS generado", formatRD(itbis)],
            ["Gastos totales", formatRD(totalGastos)],
            ["Rentabilidad", formatRD(rentabilidad)],
            ...porEmp.map(e => [`Ventas - Empleado: ${e.nombre}`, formatRD(e.total)]),
            ...topPrendas.map(([n, q]) => [`Top Prenda: ${n}`, `${q} procesadas`])
          ]}
        />
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPI t="Ventas totales" v={formatRD(ventas)} />
        <KPI t="ITBIS generado" v={formatRD(itbis)} sub="Para declaración DGII" />
        <KPI t="Gastos totales" v={formatRD(totalGastos)} />
        <KPI t="Rentabilidad" v={formatRD(rentabilidad)} accent />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg">Ventas por método de pago</h3>
          <div className="space-y-3">
            {Object.entries(porMetodo).map(([m, v]) => {
              const pct = (v / Math.max(1, ventas)) * 100;
              const icons: Record<string, string> = {
                EFECTIVO: "💵",
                TARJETA: "💳",
                TRANSFERENCIA: "🏦",
                CREDITO: "📝"
              };
              return (
                <div key={m}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="text-base">{icons[m] || "💰"}</span>
                      {m}
                    </span>
                    <span className="font-medium">{formatRD(v)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg">Ventas por empleado</h3>
          <div className="space-y-2">
            {porEmp.map((e) => (
              <div key={e.nombre} className="flex items-center justify-between rounded-lg bg-surface-elevated p-3 text-sm">
                <div><div className="font-medium">{e.nombre}</div><div className="text-xs text-muted-foreground">{e.n} órdenes</div></div>
                <div className="font-display text-lg">{formatRD(e.total)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="mb-4 font-display text-lg">Top prendas procesadas</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {topPrendas.map(([n, q]) => (
              <div key={n} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <span>{n}</span>
                <span className="font-display text-lg text-primary">{q}</span>
              </div>
            ))}
            {topPrendas.length === 0 && <div className="text-muted-foreground">Sin datos</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function KPI({ t, v, sub, accent }: { t: string; v: string; sub?: string; accent?: boolean }) {
  return (
    <Card className={`p-5 ${accent ? "bg-gradient-primary text-white" : ""}`}>
      <div className={`text-xs uppercase ${accent ? "text-white/80" : "text-muted-foreground"}`}>{t}</div>
      <div className="mt-1 font-display text-2xl">{v}</div>
      {sub && <div className={`mt-1 text-xs ${accent ? "text-white/70" : "text-muted-foreground"}`}>{sub}</div>}
    </Card>
  );
}
