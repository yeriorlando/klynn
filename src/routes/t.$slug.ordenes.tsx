import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [showPrint, setShowPrint] = useState<Orden | null>(null);
  const navigate = useNavigate();

  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cajaAbierta, setCajaAbierta] = useState<Caja | undefined>(undefined);
  const [limits, setLimits] = useState<any>({ orderLimit: null, orderCount: 0, ordersReached: false });
  const [loading, setLoading] = useState(true);

  const tenant = user?.tenant;
  const tenantId = tenant?.id || '';

  useEffect(() => {
    async function load() {
      if (!tenantId || tenantId === '__loading__') return;
      setLoading(true);
      const [oList, cList, activeCaja] = await Promise.all([
        getOrdenes(tenantId),
        getClientes(tenantId),
        getCajaAbierta(tenantId)
      ]);
      const lim = await checkPlanLimits(tenant);
      setOrdenes(oList);
      setClientes(cList);
      setCajaAbierta(activeCaja);
      setLimits(lim);
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

  if (!user || user.tenant.id === '__loading__') return null;

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
              className="bg-gradient-primary text-white h-9 px-5 font-bold shrink-0 shadow-sm border-0 transition-all active:scale-95"
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
      {/* Vista detalle */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-4xl">
          {view && (
            <OrderDetail 
              view={view} 
              tenant={tenant} 
              clientes={clientes} 
              cambiarEstado={cambiarEstado} 
              setView={setView} 
              onPrint={() => setShowPrint(view)}
            />
          )}
        </DialogContent>
      </Dialog>

      {showPrint && (
        <TicketPrintPortal 
          orden={showPrint} 
          tenant={tenant} 
          onClose={() => setShowPrint(null)} 
        />
      )}

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

function OrderDetail({ view, tenant, clientes, cambiarEstado, setView, onPrint }: { 
  view: Orden; tenant: any; clientes: any[]; cambiarEstado: any; setView: any; onPrint: () => void;
}) {
  const [empleadoView, setEmpleadoView] = useState<any>(null);
  
  useEffect(() => {
    if (view) {
      getEmpleadoById(view.empleado_id).then(setEmpleadoView);
    }
  }, [view]);

  const c = clientes.find((x) => x.id === view?.cliente_id);
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
            <Button className="flex-1 bg-gradient-primary text-white" onClick={onPrint}>
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
}
function TicketPrintPortal({ orden, tenant, onClose }: { orden: Orden; tenant: any; onClose: () => void }) {
  const [emp, setEmp] = useState<any>(null);
  const [cli, setCli] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      getEmpleadoById(orden.empleado_id),
      getClientes(tenant.id).then(list => list.find(c => c.id === orden.cliente_id))
    ]).then(([e, c]) => {
      setEmp(e);
      setCli(c);
    });
  }, [orden, tenant.id]);

  if (!emp || !cli) return null;

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target">
      <div className="max-w-md mx-auto p-8 print:p-0 print:max-w-none print:m-0">
        <div className="flex justify-between items-start border-b-2 border-primary/20 pb-4 mb-8 print:hidden relative z-[100000]">
          <Button 
            variant="outline" 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            className="cursor-pointer"
          >
            Cerrar vista de impresión
          </Button>
          <Button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.print(); }} 
            className="bg-primary text-white gap-2 cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Imprimir ahora
          </Button>
        </div>

        <Ticket 
          orden={orden} 
          tenant={tenant} 
          empleado={emp} 
          cliente={cli} 
          formato={tenant.config?.formato_ticket || "80mm"} 
        />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${tenant.config?.formato_ticket === "57mm" ? "57mm 210mm" : "80mm 297mm"};
            margin: 0;
          }

          html,
          body {
            width: ${tenant.config?.formato_ticket === "57mm" ? "57mm" : "80mm"};
            margin: 0 !important;
            padding: 0 !important;
            background: #fff;
            overflow: visible !important;
            height: auto !important;
          }

          /* Ocultar todo el sitio */
          body > *:not(.atomic-print-target) { display: none !important; }

          /* Mostrar solo el ticket */
          .atomic-print-target {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: ${tenant.config?.formato_ticket === "57mm" ? "57mm" : "80mm"} !important;
            max-width: ${tenant.config?.formato_ticket === "57mm" ? "57mm" : "80mm"} !important;
            padding: ${tenant.config?.formato_ticket === "57mm" ? "2.5mm" : "4mm"};
            margin: 0;
            background: white;
            color: black;
            font-family: monospace;
            font-size: ${tenant.config?.formato_ticket === "57mm" ? "10px" : "12px"};
            line-height: ${tenant.config?.formato_ticket === "57mm" ? "1.2" : "1.3"};
            box-sizing: border-box;
          }

          .no-print, nav, aside, header, footer, button {
            display: none !important;
          }
        }
      `}} />
    </div>,
    document.body
  );
}
