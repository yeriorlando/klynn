import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Truck, MapPin, CheckCircle2, Clock } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { ExportAndPrintButtons } from "@/components/klynn/ExportAndPrintButtons";
import { EstadoBadge } from "@/components/klynn/TenantShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOrdenes, getClientes, getEmpleados, saveOrden, formatRD, formatDateRD, type Orden, type Cliente, type Empleado } from "@/lib/storage";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/t/$slug/entregas")({ component: EntregasPage });

function EntregasPage() {
  const user = useRequireAuth();
  const [refresh, setRefresh] = useState(0);
  const [tab, setTab] = useState<"pendientes" | "entregadas">("pendientes");
  const [ordenesRaw, setOrdenesRaw] = useState<Orden[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [repartidores, setRepartidores] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  const tenant = user?.tenant;

  useEffect(() => {
    async function load() {
      if (!tenant || tenant.id === '__loading__') return;
      setLoading(true);
      const [oList, cList, eList] = await Promise.all([
        getOrdenes(tenant.id),
        getClientes(tenant.id),
        getEmpleados(tenant.id)
      ]);
      setOrdenesRaw(oList);
      setClientes(cList);
      setRepartidores(eList.filter(e => e.rol === "REPARTIDOR" && e.activo));
      setLoading(false);
    }
    load();
  }, [tenant?.id, refresh]);

  const ordenes = useMemo(() => {
    if (tab === "pendientes") return ordenesRaw.filter(o => o.estado === "LISTA");
    return ordenesRaw.filter(o => o.estado === "ENTREGADA");
  }, [ordenesRaw, tab]);

  if (!user || user.tenant.id === '__loading__') return null;

  async function marcarEntregada(id: string) {
    const o = ordenes.find((x) => x.id === id);
    if (!o) return;
    try {
      const next = { ...o, estado: "ENTREGADA" as const };
      await saveOrden(next);
      toast.success("Marcada como entregada");
      setRefresh((r) => r + 1);
      
      const cli = clientes.find((c) => c.id === o.cliente_id);
      if (cli) {
        const { notificarWhatsApp } = await import("@/lib/whatsapp");
        const r = await notificarWhatsApp(tenant, cli, next, "entregada");
        if (r.ok) toast.success("WhatsApp enviado al cliente");
      }
    } catch (err: any) {
      toast.error("Error al marcar como entregada");
    }
  }

  return (
    <div>
      <PageHeader title="Entregas" description={tab === "pendientes" ? "Órdenes listas para entregar al cliente o repartir." : "Historial de órdenes entregadas."}>
        <ExportAndPrintButtons 
          filename={tab === "pendientes" ? "Entregas_Pendientes" : "Entregas_Realizadas"} 
          printTitle={tab === "pendientes" ? "Entregas Pendientes" : "Historial de Entregas"}
          tenant={tenant}
          columns={["Orden", "Cliente", "Teléfono", "Dirección", "Total", "Fecha Estimada"]}
          data={ordenes.map(o => {
            const c = clientes.find(x => x.id === o.cliente_id);
            return [
              o.numero,
              c?.nombre || "—",
              c?.telefono || "—",
              c?.direccion || "En local",
              formatRD(o.total),
              formatDateRD(o.fecha_entrega)
            ];
          })}
        />
      </PageHeader>
      
      <div className="mb-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="bg-surface-elevated border border-border shadow-sm rounded-xl p-1 h-auto">
            <TabsTrigger value="pendientes" className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium data-[state=active]:shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground transition-all">
              <Clock className="h-4 w-4" /> Órdenes pendientes
            </TabsTrigger>
            <TabsTrigger value="entregadas" className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium data-[state=active]:shadow-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground transition-all">
              <CheckCircle2 className="h-4 w-4" /> Órdenes entregadas
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Orden</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Dirección</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Entrega</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((o) => {
                const c = clientes.find((x) => x.id === o.cliente_id);
                return (
                  <tr key={o.id} className="border-b border-border/50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{o.numero}</td>
                    <td className="px-4 py-3">{c?.nombre} <span className="text-xs text-muted-foreground">· {c?.telefono}</span></td>
                    <td className="px-4 py-3 text-xs">
                      {c?.direccion ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.direccion}</span> : <span className="text-muted-foreground">En local</span>}
                    </td>
                    <td className="px-4 py-3"><EstadoBadge estado={o.estado} /></td>
                    <td className="px-4 py-3 text-right">{formatRD(o.total)}</td>
                    <td className="px-4 py-3 text-right text-xs">{formatDateRD(o.fecha_entrega)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => marcarEntregada(o.id)} disabled={o.estado !== "LISTA"}>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Entregada
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {ordenes.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-muted-foreground"><Truck className="mx-auto mb-2 h-8 w-8 opacity-40" />No hay entregas {tab === "pendientes" ? "pendientes" : "realizadas"}.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {repartidores.length > 0 && (
        <Card className="mt-4 p-4 text-sm text-muted-foreground">
          <strong>Repartidores activos:</strong> {repartidores.map((r) => r.nombre).join(", ")}
        </Card>
      )}
    </div>
  );
}
