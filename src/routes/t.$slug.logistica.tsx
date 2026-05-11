import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bike,
  Package,
  MapPin,
  CheckCircle2,
  Clock,
  Search,
  Phone,
  Navigation,
  TrendingUp,
  PackageCheck,
  Truck,
  AlertCircle,
  Filter,
  X,
  Undo2,
  Timer,
  ChevronRight,
  User as UserIcon,
  Shirt,
  Calendar,
  Route as RouteIcon,
  Map,
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { 
  getOrdenes, getClientes, saveOrden, formatRD, formatDateRD, 
  type Orden, type Cliente, type EstadoOrden 
} from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/t/$slug/logistica")({
  component: LogisticaPage,
});

function LogisticaPage() {
  const user = useRequireAuth();
  const [ordenesRaw, setOrdenesRaw] = useState<Orden[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<EstadoOrden | "TODAS">("TODAS");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [routeOpen, setRouteOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(new Date());

  const tenant = user?.tenant;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function load() {
      if (!tenant || tenant.id === '__loading__') return;
      setLoading(true);
      const [oList, cList] = await Promise.all([
        getOrdenes(tenant.id),
        getClientes(tenant.id)
      ]);
      // Solo nos interesan órdenes que requieren entrega (LISTA, EN_CAMINO) o que ya fueron ENTREGADAS hoy
      setOrdenesRaw(oList);
      setClientes(cList);
      setLoading(false);
    }
    load();
  }, [tenant?.id, refresh]);

  const stats = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0];
    return {
      pendientes: ordenesRaw.filter(o => o.estado === "LISTA").length,
      enCamino: ordenesRaw.filter(o => o.estado === "EN_CAMINO").length,
      entregadasHoy: ordenesRaw.filter(o => o.estado === "ENTREGADA").length,
      total: ordenesRaw.filter(o => ["LISTA", "EN_CAMINO", "ENTREGADA"].includes(o.estado)).length,
    };
  }, [ordenesRaw]);

  const progress = stats.total ? Math.round((stats.entregadasHoy / stats.total) * 100) : 0;

  const filtered = useMemo(() => {
    return ordenesRaw.filter((o) => {
      // Filtrar por estados relevantes para logística
      if (!["LISTA", "EN_CAMINO", "ENTREGADA"].includes(o.estado)) return false;

      const matchStatus = filter === "TODAS" ? true : o.estado === filter;
      const q = query.trim().toLowerCase();
      const cli = clientes.find(c => c.id === o.cliente_id);
      const matchQuery = !q || 
        o.numero.toLowerCase().includes(q) || 
        cli?.nombre.toLowerCase().includes(q) || 
        cli?.direccion?.toLowerCase().includes(q);
      
      return matchStatus && matchQuery;
    }).sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
  }, [ordenesRaw, filter, query, clientes]);

  const updateStatus = async (id: string, nextStatus: EstadoOrden) => {
    const o = ordenesRaw.find(x => x.id === id);
    if (!o) return;
    try {
      const next = { ...o, estado: nextStatus };
      await saveOrden(next);
      setRefresh(r => r + 1);
      
      const msg = nextStatus === "EN_CAMINO" ? "Orden en camino 🛵" : "Orden entregada ✅";
      toast.success(msg);

      // Notificar por WhatsApp
      const cli = clientes.find(c => c.id === o.cliente_id);
      if (cli && tenant) {
        const { notificarWhatsApp } = await import("@/lib/whatsapp");
        const action = nextStatus === "EN_CAMINO" ? "en_camino" : "entregada";
        await notificarWhatsApp(tenant, cli, next, action as any);
      }
    } catch (err) {
      toast.error("Error al actualizar estado");
    }
  };

  const selectedOrder = useMemo(() => ordenesRaw.find(o => o.id === detailId), [ordenesRaw, detailId]);
  const selectedClient = useMemo(() => clientes.find(c => c.id === selectedOrder?.cliente_id), [clientes, selectedOrder]);

  if (!user || user.tenant.id === '__loading__') return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="mb-6 relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          {/* Subtle background element */}
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            
            {/* Left Column (Text) */}
            <div className="flex-1 space-y-3 max-w-lg">
              <button 
                onClick={() => setRouteOpen(true)}
                className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white shadow-sm transition-all hover:bg-primary/90 active:scale-95 cursor-pointer"
              >
                <Navigation className="h-3 w-3" /> Ver ruta del día
              </button>
              
              <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900 leading-snug">
                Hola {user.empleado.nombre.split(' ')[0]}, tienes <span className="text-primary">{stats.pendientes + stats.enCamino}</span> entregas activas
              </h1>
              
              <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                Gestiona tus rutas, marca envíos <span className="font-semibold text-primary">en camino</span> y confirma entregas. El cliente recibirá notificaciones automáticas.
              </p>
            </div>
            
            {/* Right Column (Floating Progress Card & Button) */}
            <div className="w-full lg:w-[340px] flex flex-col gap-3 relative shrink-0">
              <div className="rounded-[1.25rem] border border-slate-100 bg-white p-5 shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-primary mb-2.5">
                  <span>Progreso del día</span>
                  <span className="text-slate-600">{stats.entregadasHoy}/{stats.total} · {progress}%</span>
                </div>
                
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div 
                    className="h-full rounded-full bg-[#3B66F5] transition-all duration-1000" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>

                {progress === 100 && stats.total > 0 && (
                  <div className="mt-2.5 flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 border border-emerald-100 shadow-sm">
                      🌟 Has hecho un muy buen trabajo
                    </p>
                  </div>
                )}
                
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-50 pt-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-primary">
                      <Timer className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-medium text-slate-500">Hora actual</p>
                      <p className="text-xs font-bold text-slate-900">{now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  
                  <div className="h-6 w-px bg-slate-100" />
                  
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-primary">
                      <Calendar className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-medium text-slate-500">Hoy es</p>
                      <p className="text-xs font-bold text-slate-900">{new Date().toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Pendientes" value={stats.pendientes} icon={<Clock />} color="amber" />
          <StatCard label="En camino" value={stats.enCamino} icon={<Truck />} color="sky" />
          <StatCard label="Entregadas hoy" value={stats.entregadasHoy} icon={<PackageCheck />} color="emerald" />
          <StatCard label="Total ruta" value={stats.total} icon={<TrendingUp />} color="indigo" />
        </section>

        {/* Toolbar */}
        <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por cliente, orden o dirección..."
              className="h-12 w-full rounded-2xl border-slate-200 bg-white pl-10 pr-4 text-sm shadow-sm transition-all focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
            <Filter className="h-4 w-4 shrink-0 text-slate-400 mr-2" />
            {(["TODAS", "LISTA", "EN_CAMINO", "ENTREGADA"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  filter === opt
                    ? "bg-slate-900 text-white shadow-md scale-105"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt === "TODAS" ? "Todas" : opt.replace('_', ' ')}
              </button>
            ))}
          </div>
        </section>

        {/* Orders Grid */}
        <section className="grid gap-6 lg:grid-cols-2">
          {filtered.length === 0 ? (
            <Card className="col-span-full flex flex-col items-center justify-center rounded-[2rem] border-dashed border-slate-300 py-20 text-center bg-white/50">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Bike className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No hay entregas pendientes</h3>
              <p className="text-sm text-slate-500">Todo listo por ahora o ajusta los filtros.</p>
            </Card>
          ) : (
            filtered.map((o) => (
              <DeliveryCard
                key={o.id}
                orden={o}
                cliente={clientes.find(c => c.id === o.cliente_id)}
                onUpdateStatus={updateStatus}
                onClick={() => setDetailId(o.id)}
              />
            ))
          )}
        </section>
      </main>

      {/* Route Modal */}
      <Dialog open={routeOpen} onOpenChange={(o) => !o && setRouteOpen(false)}>
        <DialogContent className="max-w-lg rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
          <div className="flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                  <RouteIcon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-slate-900">Ruta del día</h2>
                  <p className="text-[10px] text-slate-500">
                    {ordenesRaw.filter(o => ["LISTA", "EN_CAMINO"].includes(o.estado)).length} paradas · orden sugerido
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="border-b border-slate-100 p-6 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 text-center relative overflow-hidden">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-3xl" />
              <div className="absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-indigo-500/5 blur-3xl" />
              
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/70 mb-2">Resumen de Entrega</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="h-[1px] w-10 bg-gradient-to-r from-transparent to-slate-200" />
                  <p className="text-5xl font-black text-slate-950 tracking-tighter">
                    {ordenesRaw.filter(o => ["LISTA", "EN_CAMINO"].includes(o.estado)).length}
                  </p>
                  <div className="h-[1px] w-10 bg-gradient-to-l from-transparent to-slate-200" />
                </div>
                <p className="text-[11px] font-bold text-slate-400 mt-2">Paradas totales en ruta</p>
              </div>
            </div>

            {/* Stops List */}
            <ScrollArea className="flex-1 px-4 py-6">
              <div className="relative space-y-3 border-l-2 border-dashed border-slate-300 pl-7 ml-3.5 pt-2">
                {ordenesRaw
                  .filter(o => ["LISTA", "EN_CAMINO"].includes(o.estado))
                  .map((o, i) => {
                    const cli = clientes.find(c => c.id === o.cliente_id);
                    return (
                      <div key={o.id} className="relative">
                        <div className="absolute -left-[41px] top-0 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-500 ring-2 ring-slate-400 shadow-sm">
                          {i + 1}
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-primary/20">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{cli?.nombre || "Sin nombre"}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 truncate">{cli?.direccion || "Sin dirección"}</p>
                              <div className="flex items-center gap-2.5 mt-2.5 text-[9px] font-bold text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" /> {new Date(o.creado_en).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="flex items-center gap-1 text-emerald-600 uppercase tracking-widest">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Pagado
                                </span>
                              </div>
                            </div>
                            <Badge className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0 border shadow-none shrink-0 ${
                              o.estado === "LISTA" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-sky-50 text-sky-600 border-sky-100"
                            }`}>
                              {o.estado === "LISTA" ? "Pendiente" : "En camino"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-slate-100 bg-white px-4 py-3">
              <Button 
                variant="outline" 
                onClick={() => setRouteOpen(false)} 
                className="rounded-xl h-9 px-5 border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-lg rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
          {selectedOrder && (
            <div className="flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <Package className="h-3 w-3" />
                      {selectedOrder.numero}
                    </span>
                    <Badge className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border-none shadow-sm ${
                      selectedOrder.estado === "LISTA" ? "bg-amber-50 text-amber-700" :
                      selectedOrder.estado === "EN_CAMINO" ? "bg-sky-50 text-sky-700" :
                      "bg-emerald-50 text-emerald-700"
                    }`}>
                      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                        selectedOrder.estado === "LISTA" ? "bg-amber-500" :
                        selectedOrder.estado === "EN_CAMINO" ? "bg-sky-500" :
                        "bg-emerald-500"
                      }`} />
                      {selectedOrder.estado === "LISTA" ? "Pendiente" : 
                       selectedOrder.estado === "EN_CAMINO" ? "En camino" : "Entregado"}
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-slate-900">{selectedClient?.nombre || "Sin nombre"}</h2>
                </div>

              </div>

              {/* Body */}
              <div className="space-y-6 px-6 py-6 overflow-y-auto max-h-[70vh]">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">Estado de pago</p>
                    <div className="flex items-center gap-2 text-base font-bold text-emerald-900">
                      <CheckCircle2 className="h-4 w-4" /> Pagado
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Prendas</p>
                    <div className="text-xl font-black text-slate-900">
                      {selectedOrder.items.reduce((acc, it) => acc + it.cantidad, 0)}
                    </div>
                  </div>
                </div>

                {/* Details List */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{selectedClient?.direccion || "Entrega en local"}</p>
                      <p className="text-xs text-slate-400">Dirección de entrega</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Recibida: {formatDateRD(selectedOrder.creado_en)}</p>
                      <p className="text-xs text-slate-400">Horario de registro</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{selectedClient?.telefono}</p>
                      <p className="text-xs text-slate-400">Contacto del cliente</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    className="h-9 px-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-sm shadow-sm transition-all active:scale-95"
                    asChild
                  >
                    <a href={`https://wa.me/${selectedClient?.telefono?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${selectedClient?.nombre?.split(' ')[0] || ''}, te contacto de ${user.tenant?.nombre || "la lavandería"} respecto a tu orden ${selectedOrder.numero}. `)}`} target="_blank">
                      <Phone className="mr-2 h-4 w-4" /> WhatsApp
                    </a>
                  </Button>
                  <Button 
                    className="h-9 px-1 rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-bold text-sm shadow-sm transition-all active:scale-95"
                    onClick={() => toast("Incidencia reportada", { description: "Se ha notificado al local." })}
                  >
                    <AlertCircle className="mr-2 h-4 w-4" /> Incidencia
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-5">
                <Button 
                  variant="ghost" 
                  size="sm"
                  disabled={selectedOrder.estado === "LISTA"}
                  onClick={() => { updateStatus(selectedOrder.id, "LISTA"); setDetailId(null); }}
                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs tracking-widest disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <Undo2 className="mr-2 h-4 w-4" /> Revertir
                </Button>

                {selectedOrder.estado !== "ENTREGADA" && (
                  <Button 
                    size="sm"
                    className={`h-10 px-4 rounded-xl font-bold text-xs tracking-wide shadow-lg transition-all active:scale-95 ${
                      selectedOrder.estado === "LISTA" ? "bg-primary text-white" : "bg-emerald-600 text-white"
                    }`}
                    onClick={() => { 
                      updateStatus(selectedOrder.id, selectedOrder.estado === "LISTA" ? "EN_CAMINO" : "ENTREGADA"); 
                      setDetailId(null); 
                    }}
                  >
                    {selectedOrder.estado === "LISTA" ? (
                      <>
                        <Truck className="mr-2 h-4 w-4" /> Marcar En Camino
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar Entrega
                      </>
                    )}
                  </Button>
                )}
                {selectedOrder.estado === "ENTREGADA" && (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                    <CheckCircle2 className="h-4 w-4" /> Entregado
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: 'amber' | 'sky' | 'emerald' | 'indigo' }) {
  const colors = {
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    sky: "bg-sky-50 text-sky-600 border-sky-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  };
  return (
    <Card className="p-5 rounded-3xl border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center border ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-display font-black text-slate-900">{value}</div>
    </Card>
  );
}

function DeliveryCard({ 
  orden, 
  cliente, 
  onUpdateStatus, 
  onClick 
}: { 
  orden: Orden; 
  cliente?: Cliente; 
  onUpdateStatus: (id: string, s: EstadoOrden) => void; 
  onClick: () => void; 
}) {
  const statusMeta: Record<string, { label: string; dot: string; chip: string; border: string }> = {
    LISTA: {
      label: "Pendiente",
      dot: "bg-amber-500",
      chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      border: "border-l-amber-400",
    },
    EN_CAMINO: {
      label: "En camino",
      dot: "bg-sky-500",
      chip: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
      border: "border-l-sky-500",
    },
    ENTREGADA: {
      label: "Entregado",
      dot: "bg-emerald-500",
      chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
      border: "border-l-emerald-500",
    },
  };

  const meta = statusMeta[orden.estado] || statusMeta.LISTA;
  const nextLabel =
    orden.estado === "LISTA"
      ? "Marcar en camino"
      : orden.estado === "EN_CAMINO"
        ? "Confirmar entrega"
        : "Entregado";

  const totalPrendas = orden.items.reduce((acc, it) => acc + it.cantidad, 0);

  return (
    <article
      onClick={onClick}
      className={`group relative cursor-pointer rounded-[2rem] border border-slate-300 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-primary/20`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700">
              <Package className="h-3 w-3" />
              {orden.numero}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            {orden.es_urgente && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 ring-1 ring-rose-200">
                ⚡ Express
              </span>
            )}
          </div>
          <h3 className="mt-2 truncate text-base font-semibold text-slate-900 group-hover:text-primary transition-colors">
            {cliente?.nombre || "Sin nombre"}
          </h3>
        </div>

        <div className="text-right">
          <p className="text-lg font-bold text-primary">
            {formatRD(orden.total)}
          </p>
          <p className="text-xs font-black uppercase tracking-wider text-primary/70">
            {totalPrendas} prenda{totalPrendas !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="flex items-start gap-2 text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <p className="truncate text-slate-800 font-medium">{cliente?.direccion || "Entrega en local"}</p>
            <p className="text-xs font-bold text-slate-600">{cliente?.telefono}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-slate-800 font-medium"><span className="font-bold">Recibida:</span> {formatDateRD(orden.creado_en)}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `tel:${cliente?.telefono}`;
          }}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95"
        >
          <Phone className="mr-2 h-4 w-4" />
          Llamar
        </button>


        <div className="ml-auto">
          {orden.estado === "ENTREGADA" ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              Entregado
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(orden.id, orden.estado === "LISTA" ? "EN_CAMINO" : "ENTREGADA");
              }}
              className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-bold tracking-wide text-white shadow-sm transition active:scale-95 ${
                orden.estado === "LISTA"
                  ? "bg-sky-600 hover:bg-sky-700 shadow-sky-200"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
              }`}
            >
              {orden.estado === "LISTA" ? (
                <>
                  <Truck className="mr-2 h-4 w-4" /> Marcar En Camino
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar Entrega
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
