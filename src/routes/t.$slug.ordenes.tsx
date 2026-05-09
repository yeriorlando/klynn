import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Printer, Eye, XCircle, MessageCircle } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { ExportAndPrintButtons } from "@/components/klynn/ExportAndPrintButtons";
import { EstadoBadge } from "@/components/klynn/TenantShell";
import { Ticket } from "@/components/klynn/Ticket";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  getOrdenes, saveOrden, getClientes, getEmpleadoById, formatRD, formatDateTimeRD,
  type Orden, type EstadoOrden,
  checkPlanLimits, getCajaAbierta, saveMovimiento, uid
} from "@/lib/storage";
import { toast } from "sonner";
import { AlertTriangle, Rocket } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/t/$slug/ordenes")({
  component: OrdenesPage,
});

function OrdenesPage() {
  const user = useRequireAuth();
  const [q, setQ] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoOrden | "todos">("todos");
  const [view, setView] = useState<Orden | null>(null);
  const [anular, setAnular] = useState<Orden | null>(null);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [refresh, setRefresh] = useState(0);
  const navigate = useNavigate();

  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cajaAbierta, setCajaAbierta] = useState<Caja | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const tenantId = tenant.id;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [oList, cList, activeCaja] = await Promise.all([
        getOrdenes(tenantId),
        getClientes(tenantId),
        getCajaAbierta(tenantId)
      ]);
      setOrdenes(oList);
      setClientes(cList);
      setCajaAbierta(activeCaja);
      setLoading(false);
    }
    load();
  }, [tenantId, refresh]);

  const filt = useMemo(() => {
    return ordenes.filter((o) => {
      if (filtroEstado !== "todos" && o.estado !== filtroEstado) return false;
      if (!q) return true;
      const c = clientes.find((x) => x.id === o.cliente_id);
      return o.numero.toLowerCase().includes(q.toLowerCase()) || c?.nombre.toLowerCase().includes(q.toLowerCase());
    }).sort((a, b) => +new Date(b.creado_en) - +new Date(a.creado_en));
  }, [ordenes, clientes, filtroEstado, q]);

  async function cambiarEstado(o: Orden, estado: EstadoOrden) {
    try {
      await saveOrden({ ...o, estado });
      setRefresh((r) => r + 1);
      toast.success(`Estado actualizado: ${estado} ✨`);
      if (estado === "LISTA" || estado === "ENTREGADA") {
        const cli = clientes.find((c) => c.id === o.cliente_id);
        if (cli) {
          import("@/lib/whatsapp").then(({ notificarWhatsApp }) =>
            notificarWhatsApp(tenant, cli, o, estado === "LISTA" ? "lista" : "entregada").then((r) => {
              if (r.ok) toast.success("WhatsApp enviado al cliente ✅");
            }),
          );
        }
      }
    } catch (err: any) {
      toast.error("Error al actualizar estado");
    }
  }

  async function anularOrden() {
    if (!anular || motivoAnular.length < 5) { toast.error("Indica el motivo (mín 5 caracteres)"); return; }
    
    try {
      // Actualizar orden
      await saveOrden({ ...anular, estado: "ANULADA", motivo_anulacion: motivoAnular });
      
      // Registrar egreso automático si hubo pago y hay caja abierta
      if (anular.pagado > 0 && cajaAbierta) {
        await saveMovimiento({
          id: uid("mov"),
          tenant_id: tenant.id,
          caja_id: cajaAbierta.id,
          empleado_id: user.empleado.id,
          tipo: "EGRESO",
          concepto: `Reembolso: Anulación ${anular.numero}`,
          monto: anular.pagado,
          metodo: anular.metodo_pago,
          orden_id: anular.id,
          creado_en: new Date().toISOString(),
        });
        toast.info(`Se registró un egreso de ${formatRD(anular.pagado)} en caja por el reembolso. 💸`);
      }

      setAnular(null); setMotivoAnular(""); setRefresh((r) => r + 1);
      toast.success("Orden anulada ✓");
    } catch (err: any) {
      toast.error("Error al anular orden");
    }
  }

  return (
    <div>
      <PageHeader title="Órdenes" description={`${ordenes.length} órdenes registradas`}>
        <ExportAndPrintButtons 
          filename="Ordenes" 
          tenant={tenant}
          columns={["Número", "Cliente", "Estado", "Total", "Saldo", "Pago", "Fecha"]}
          data={filt.map(o => [
            o.numero, 
            clientes.find(c => c.id === o.cliente_id)?.nombre || "—",
            o.estado,
            formatRD(o.total),
            formatRD(o.saldo),
            o.metodo_pago,
            formatDateTimeRD(o.creado_en)
          ])}
        />
      </PageHeader>

      {limits.orderLimit !== null && (
        <Card className={`mb-4 border-none shadow-sm overflow-hidden ${limits.ordersReached ? "bg-destructive/5" : "bg-primary/5"}`}>
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${limits.ordersReached ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                {limits.ordersReached ? <AlertTriangle className="h-5 w-5" /> : <Rocket className="h-5 w-5" />}
              </div>
              <div>
                <div className="text-sm font-bold">
                  {limits.ordersReached 
                    ? "Has alcanzado el límite de órdenes de tu plan" 
                    : `Uso del plan: ${limits.orderCount} de ${limits.orderLimit} órdenes este mes`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {limits.ordersReached 
                    ? "Actualiza tu plan para seguir registrando nuevas órdenes." 
                    : "Llevas un buen ritmo, considera cambiar de Plan si creces más."}
                </div>
              </div>
            </div>
            <Button 
              size="sm" 
              className="bg-gradient-primary text-white rounded-xl h-9 px-4 font-bold shrink-0"
              onClick={() => navigate({ to: "/t/$slug/configuracion", params: { slug: tenant.slug } })}
            >
              🚀 Ver planes
            </Button>
          </div>

        </Card>
      )}

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por número o cliente..." className="pl-10" />
        </div>
        <Select value={filtroEstado} onValueChange={(v: any) => setFiltroEstado(v)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="RECIBIDA">Recibida</SelectItem>
            <SelectItem value="EN_PROCESO">En proceso</SelectItem>
            <SelectItem value="LISTA">Lista</SelectItem>
            <SelectItem value="ENTREGADA">Entregada</SelectItem>
            <SelectItem value="ANULADA">Anulada</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Número</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Saldo</th>
                <th className="px-4 py-3 text-left">Pago</th>
                <th className="px-4 py-3 text-right">Fecha</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filt.map((o) => {
                const c = clientes.find((x) => x.id === o.cliente_id);
                return (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-accent/30">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{o.numero}</td>
                    <td className="px-4 py-3">{c?.nombre || "—"}</td>
                    <td className="px-4 py-3"><EstadoBadge estado={o.estado} /></td>
                    <td className="px-4 py-3 text-right font-medium">{formatRD(o.total)}</td>
                    <td className="px-4 py-3 text-right">{o.saldo > 0 ? <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning-foreground">{formatRD(o.saldo)}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-xs">{o.metodo_pago}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDateTimeRD(o.creado_en)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setView(o)}><Eye className="h-4 w-4" /></Button>
                        {o.estado !== "ANULADA" && (
                          <Button size="icon" variant="ghost" onClick={() => setAnular(o)}><XCircle className="h-4 w-4 text-destructive" /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filt.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">Sin órdenes</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Vista detalle */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-4xl">
          {view && (() => {
            const [empleadoView, setEmpleadoView] = useState<any>(null);
            
            useEffect(() => {
              if (view) {
                getEmpleadoById(view.empleado_id).then(setEmpleadoView);
              }
            }, [view]);

            if (!c || !empleadoView) return <div className="p-12 text-center">Cargando detalles...</div>;
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Orden {view.numero}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 text-sm">
                    <div><strong>Cliente:</strong> {c.nombre}</div>
                    <div><strong>Tel:</strong> {c.telefono}</div>
                    <div><strong>Estado:</strong> <EstadoBadge estado={view.estado} /></div>
                    <div><strong>Total:</strong> {formatRD(view.total)}</div>
                    <div><strong>Pagado:</strong> {formatRD(view.pagado)}</div>
                    {view.saldo > 0 && <div className="text-warning-foreground"><strong>Saldo:</strong> {formatRD(view.saldo)}</div>}
                    <div><strong>Atendido por:</strong> {empleadoView.nombre}</div>
                    {view.motivo_anulacion && <div className="rounded-md bg-destructive/10 p-2 text-destructive"><strong>Motivo anulación:</strong> {view.motivo_anulacion}</div>}

                    <div className="pt-3">
                      <div className="mb-2 text-xs uppercase text-muted-foreground">Cambiar estado</div>
                      <div className="flex flex-wrap gap-1.5">
                        {(["RECIBIDA", "EN_PROCESO", "LISTA", "ENTREGADA"] as EstadoOrden[]).map((s) => (
                          <Button key={s} size="sm" variant={view.estado === s ? "default" : "outline"} onClick={() => { cambiarEstado(view, s); setView({ ...view, estado: s }); }}>{s.replace("_", " ")}</Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-6">
                      <Button variant="outline" className="flex-1" onClick={() => toast.success("Mensaje enviado por WhatsApp (simulado)")}>
                        <MessageCircle className="mr-1.5 h-4 w-4" /> Enviar WhatsApp
                      </Button>
                      <Button className="flex-1 bg-gradient-primary text-white" onClick={() => window.print()}>
                        <Printer className="mr-1.5 h-4 w-4" /> Imprimir
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-[500px] overflow-auto rounded-xl bg-zinc-100 p-4 shadow-inner dark:bg-zinc-800/50">
                    <Ticket orden={view} tenant={tenant} empleado={empleadoView} cliente={c} formato={tenant.config!.formato_ticket} />
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Anular */}
      <Dialog open={!!anular} onOpenChange={(o) => !o && setAnular(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Anular {anular?.numero}</DialogTitle></DialogHeader>
          <div>
            <label className="text-sm font-medium">Motivo de anulación</label>
            <Input value={motivoAnular} onChange={(e) => setMotivoAnular(e.target.value)} placeholder="ej. error de cobro" className="mt-1.5" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnular(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={anularOrden}>Anular orden</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
