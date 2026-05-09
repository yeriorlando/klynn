import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, ArrowRight, Plus, Trash2, Search, UserPlus, Check, AlertTriangle, 
  Printer, Phone, Shirt, Truck, Maximize2, Minimize2, LayoutGrid, List,
  ShoppingCart, User as UserIcon, X, Minus
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { Ticket } from "@/components/klynn/Ticket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getClientes, saveCliente, getCatalogo, getServicios, getCajaAbierta, saveOrden, saveMovimiento,
  nextOrdenNumero, formatRD, formatPhoneRD, uid, DEFAULT_CONFIG,
  formatAmountInput, parseAmount, saveTenant,
  type Cliente, type OrdenItem, type MetodoPago, type Orden,
  checkPlanLimits,
} from "@/lib/storage";
import { PlanLimitModal } from "@/components/klynn/PlanLimitModal";
import { toast } from "sonner";

export const Route = createFileRoute("/t/$slug/nueva-orden")({
  component: NuevaOrdenPage,
});

function NuevaOrdenPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isPosMode, setIsPosMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("TODOS");
  const [posSearch, setPosSearch] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);

  const [clienteSearch, setClienteSearch] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [showNewCliente, setShowNewCliente] = useState(false);

  const [serviciosSel, setServiciosSel] = useState<string[]>(["Lavado y secado"]);
  const [items, setItems] = useState<OrdenItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [esUrgente, setEsUrgente] = useState(false);
  const [aplicarItbis, setAplicarItbis] = useState(true);
  const [descuento, setDescuento] = useState(0);
  const [fechaEntrega, setFechaEntrega] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [notas, setNotas] = useState("");
  const [servicioDomicilio, setServicioDomicilio] = useState(false);
  const [direccionDomicilio, setDireccionDomicilio] = useState("");

  useEffect(() => {
    if (isPosMode) {
      document.body.classList.add("pos-mode");
    } else {
      document.body.classList.remove("pos-mode");
    }
    return () => document.body.classList.remove("pos-mode");
  }, [isPosMode]);

  useEffect(() => {
    if (cliente) {
      setDireccionDomicilio(cliente.direccion || "");
      if (cliente.direccion) setServicioDomicilio(true);
    }
  }, [cliente]);

  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [recibido, setRecibido] = useState<number>(0);

  const [creada, setCreada] = useState<Orden | null>(null);
  const [showTicket, setShowTicket] = useState(false);

  const tenantId = user?.tenant.id ?? "";
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  useEffect(() => {
    async function load() {
      if (!tenantId) return;
      setLoadingCatalog(true);
      const [c, s] = await Promise.all([
        getCatalogo(tenantId),
        getServicios(tenantId)
      ]);
      setCatalogo(c.filter(i => i.activo));
      setServicios(s.filter(srv => srv.activo));
      setLoadingCatalog(false);
    }
    load();
  }, [tenantId]);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [caja, setCaja] = useState<Caja | undefined>(undefined);

  useEffect(() => {
    async function load() {
      if (!tenantId) return;
      const [list, activeCaja] = await Promise.all([
        getClientes(tenantId),
        getCajaAbierta(tenantId)
      ]);
      setClientes(list);
      setCaja(activeCaja);
    }
    load();
  }, [tenantId]);

  const limits = useMemo(() => user ? checkPlanLimits(user.tenant) : null, [user]);

  useEffect(() => {
    if (limits?.ordersReached) {
      setShowLimitModal(true);
    }
  }, [limits]);

  if (!user) return null;
  const { tenant, empleado } = user;
  const cfg = tenant.config || DEFAULT_CONFIG;

  const filtrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    c.telefono.includes(clienteSearch),
  );

  const subtotalBase = items.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0);
  const costoServicios = servicios.filter(s => serviciosSel.includes(s.nombre)).reduce((acc, s) => acc + s.precio, 0);
  const recargo = esUrgente ? subtotalBase * (cfg.recargo_urgencia / 100) : 0;
  
  // El "subtotalBruto" es la suma base antes de impuestos.
  const subtotalBruto = subtotalBase + recargo + costoServicios;
  
  let itbis = 0;
  let subtotal = subtotalBruto;
  let total = subtotalBruto;

  if (cfg.ncf_facturacion_activa && aplicarItbis) {
    if (cfg.itbis_incluido) {
      // Precio ya tiene ITBIS: Extraerlo
      // ITBIS = Total - (Total / 1.18)
      subtotal = +(subtotalBruto / (1 + cfg.itbis_porcentaje / 100)).toFixed(2);
      itbis = +(subtotalBruto - subtotal).toFixed(2);
      total = subtotalBruto - descuento;
    } else {
      // Precio no tiene ITBIS: Sumarlo
      itbis = +(subtotalBruto * (cfg.itbis_porcentaje / 100)).toFixed(2);
      total = subtotalBruto + itbis - descuento;
    }
  } else {
    total = subtotalBruto - descuento;
  }

  const vuelto = metodo === "EFECTIVO" && recibido > total ? recibido - total : 0;
  const faltante = metodo === "EFECTIVO" && recibido > 0 && recibido < total ? total - recibido : 0;

  function addItem(it: OrdenItem) { 
    setItems((arr) => {
      const idx = arr.findIndex(x => x.descripcion === it.descripcion && x.precio_unitario === it.precio_unitario);
      if (idx > -1) {
        return arr.map((item, i) => i === idx ? { ...item, cantidad: item.cantidad + it.cantidad } : item);
      }
      return [...arr, it];
    }); 
  }
  function removeItem(i: number) { setItems((arr) => arr.filter((_, idx) => idx !== i)); }
  function updateItemQuantity(i: number, delta: number) {
    setItems((arr) => arr.map((it, idx) => {
      if (idx !== i) return it;
      const newQty = Math.max(1, it.cantidad + delta);
      return { ...it, cantidad: newQty };
    }));
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error al activar pantalla completa: ${e.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(catalogo.map(c => c.categoria || "Otros"));
    return ["TODOS", "Servicios", ...Array.from(cats)];
  }, [catalogo]);

  const catalogFiltered = useMemo(() => {
    let list = catalogo;
    // Si NO hay búsqueda activa, respetamos el filtro de categoría.
    // Si HAY búsqueda, buscamos en todo el catálogo ignorando la categoría seleccionada.
    if (!posSearch && activeCategory !== "TODOS" && activeCategory !== "Servicios") {
      list = list.filter(c => (c.categoria || "Otros") === activeCategory);
    }
    if (posSearch) {
      list = list.filter(c => c.nombre.toLowerCase().includes(posSearch.toLowerCase()));
    }
    return list;
  }, [catalogo, activeCategory, posSearch]);

  const servicesFiltered = useMemo(() => {
    if (posSearch) {
      return servicios.filter(s => s.nombre.toLowerCase().includes(posSearch.toLowerCase()));
    }
    return servicios;
  }, [servicios, posSearch]);

  async function onCrearOrden() {
    if (limits?.ordersReached) { setShowLimitModal(true); return; }
    if (!cliente) { toast.error("Selecciona un cliente"); return; }
    if (items.length === 0) { toast.error("Agrega al menos una prenda"); return; }
    if (metodo !== "CREDITO" && !caja) { toast.error("Abre la caja antes de cobrar"); return; }
    if (metodo === "EFECTIVO" && recibido < total) { toast.error("El monto recibido es menor al total"); return; }

    try {
      const pagado = metodo === "CREDITO" ? 0 : total;
      const saldo = total - pagado;
      
      const numero = await nextOrdenNumero(tenant.id);
      
      const orden: Orden = {
        id: uid("ord"),
        tenant_id: tenant.id,
        numero,
        cliente_id: cliente.id,
        empleado_id: empleado.id,
        servicios: serviciosSel,
        items,
        subtotal: +subtotal.toFixed(2),
        itbis,
        descuento,
        total,
        pagado,
        saldo,
        metodo_pago: metodo,
        estado: "RECIBIDA",
        fecha_entrega: new Date(fechaEntrega).toISOString(),
        es_urgente: esUrgente,
        notas: notas || undefined,
        creado_en: new Date().toISOString(),
        ncf: cfg.ncf_facturacion_activa && cfg.ncf_secuencia ? `${cfg.ncf_secuencia}${String(cfg.ncf_proximo || 1).padStart(8, "0")}` : undefined,
      };

      await saveOrden(orden);

      // Incrementar NCF si se usó
      if (orden.ncf) {
        await saveTenant({
          ...tenant,
          config: {
            ...cfg,
            ncf_proximo: (cfg.ncf_proximo || 1) + 1,
          },
        });
      }

      if (caja && metodo !== "CREDITO") {
        await saveMovimiento({
          id: uid("mov"), tenant_id: tenant.id, caja_id: caja.id, empleado_id: empleado.id,
          tipo: "VENTA", concepto: `Venta ${orden.numero}`, monto: pagado, metodo,
          orden_id: orden.id, creado_en: new Date().toISOString(),
        });
      }
      
      setCreada(orden);
      setShowTicket(true);
      toast.success(`Orden ${orden.numero} creada ✅`);

      // Actualizar dirección del cliente si cambió o es nueva
      if (cliente && servicioDomicilio && direccionDomicilio.trim() && direccionDomicilio !== cliente.direccion) {
        await saveCliente({ ...cliente, direccion: direccionDomicilio.trim() });
      }

      if (cliente) {
        import("@/lib/whatsapp").then(({ notificarWhatsApp }) =>
          notificarWhatsApp(tenant, cliente, orden, "creada").then((r) => {
            if (r.ok) toast.success("WhatsApp enviado al cliente ✅");
          }),
        );
      }
    } catch (err: any) {
      toast.error("Error al crear la orden: " + err.message);
    }
  }

  function next() {
    if (limits?.ordersReached) { setShowLimitModal(true); return; }
    if (step === 1 && !cliente) { toast.error("Selecciona un cliente"); return; }
    if (step === 2 && serviciosSel.length === 0) { toast.error("Selecciona al menos un servicio"); return; }
    if (step === 3 && items.length === 0) { toast.error("Agrega al menos una prenda"); return; }
    setStep((s) => Math.min(5, s + 1));
  }

  return (
    <div className={`mx-auto ${isPosMode ? "max-w-none h-[calc(100vh-100px)] flex flex-col" : "max-w-5xl"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 flex-1">
          <PageHeader title={isPosMode ? "Terminal POS" : "Nueva orden"} description={isPosMode ? "Venta rápida" : `Paso ${step} de 5`} />
          {isPosMode && (
            <div className="relative w-72 max-w-md animate-in fade-in slide-in-from-left-4 duration-500">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input 
                value={posSearch} 
                onChange={(e) => setPosSearch(e.target.value)} 
                placeholder="Buscar prenda o servicio..." 
                className="pl-10 h-10 bg-accent/30 border-primary/5 focus-visible:ring-primary/20 rounded-xl shadow-inner border-0" 
              />
              {posSearch && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent" onClick={() => setPosSearch("")}>
                  <X className="h-3.5 w-3.5 text-muted-foreground/30" />
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={isPosMode ? "default" : "outline"} 
            size="sm" 
            onClick={() => setIsPosMode(!isPosMode)}
            className={isPosMode ? "bg-primary text-white shadow-glow" : ""}
          >
            {isPosMode ? <List className="mr-2 h-4 w-4" /> : <LayoutGrid className="mr-2 h-4 w-4" />}
            {isPosMode ? "Modo Clásico" : "Modo POS"}
          </Button>
          {isPosMode && (
            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {!caja && (
        <Card className="mb-4 flex items-center gap-3 border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 text-warning" />
          La caja está cerrada. Solo podrás registrar órdenes en crédito.
        </Card>
      )}

      {isPosMode ? (
        <div className="flex flex-1 gap-6 overflow-hidden min-h-[600px]">
          {/* CATALOG GRID */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 pb-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm border ${
                    activeCategory === cat 
                      ? "bg-primary text-white border-primary shadow-glow ring-2 ring-primary/20 ring-offset-2 ring-offset-background" 
                      : "bg-card text-muted-foreground hover:bg-accent border-border/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
              {step === 5 ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-display font-bold text-foreground">Panel de Cobro</h2>
                    <Button variant="secondary" size="sm" onClick={() => setStep(2)} className="bg-accent/50 hover:bg-accent/80 border-border/50 shadow-sm transition-all active:scale-95">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Volver al catálogo
                    </Button>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    {[
                      { id: "EFECTIVO", label: "Efectivo", icon: "💵" },
                      { id: "TARJETA", label: "Tarjeta", icon: "💳" },
                      { id: "TRANSFERENCIA", label: "Transf.", icon: "🏦" },
                      { id: "CREDITO", label: "Crédito", icon: "📝" }
                    ].map((m) => (
                      <button key={m.id} onClick={() => setMetodo(m.id as MetodoPago)}
                        className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all active:scale-95 ${
                          metodo === m.id 
                            ? "border-primary bg-primary/5 ring-1 ring-primary shadow-glow" 
                            : "border-border bg-card hover:border-primary/40"
                        }`}>
                        <span className="text-2xl">{m.icon}</span>
                        <div className="font-bold text-sm uppercase tracking-tight">{m.label}</div>
                        {metodo === m.id && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />}
                      </button>
                    ))}
                  </div>

                  {metodo === "EFECTIVO" && (
                    <div className="rounded-2xl border-2 border-border/60 bg-accent/5 p-8 mb-8">
                      <div className="grid gap-8 md:grid-cols-2 items-center">
                        <Field label="Monto recibido">
                          <div className="relative h-24">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-2xl text-muted-foreground/50">RD$</span>
                            <Input
                              className="h-full pl-24 !text-5xl font-black font-display bg-background border-2 border-primary/20 focus-visible:ring-primary/30"
                              value={recibido ? formatAmountInput(String(recibido)) : ""}
                              onChange={(e) => setRecibido(parseAmount(e.target.value))}
                              placeholder="0.00"
                            />
                          </div>
                        </Field>

                        <div className={`flex flex-col items-center justify-center h-28 rounded-xl border-2 transition-all duration-300 ${
                          faltante > 0 
                            ? "bg-destructive/5 border-destructive/30 text-destructive animate-pulse" 
                            : "bg-emerald-500/5 border-emerald-500/30 text-emerald-600"
                        }`}>
                          <div className="text-xs font-black uppercase tracking-widest opacity-70">
                            {faltante > 0 ? "Faltante" : "Vuelto a entregar"}
                          </div>
                          <div className="text-4xl font-display font-black">
                            {formatRD(faltante > 0 ? faltante : vuelto)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {metodo === "CREDITO" && (
                    <div className="flex items-center gap-4 rounded-xl border border-warning/40 bg-warning/5 p-6 text-warning-foreground mb-8">
                      <AlertTriangle className="h-8 w-8 text-warning shrink-0" />
                      <div>
                        <strong className="block text-lg">Venta a crédito</strong>
                        Se registrará en el balance de <span className="font-bold">{cliente?.nombre}</span>.
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    <Button 
                      size="lg" 
                      className="w-full h-16 text-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-glow"
                      onClick={onCrearOrden}
                      disabled={metodo === "EFECTIVO" && faltante > 0}
                    >
                      CONFIRMAR Y CREAR ORDEN
                    </Button>
                  </div>
                </div>
              ) : (step === 1 && !cliente) ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-display font-bold">Seleccionar Cliente</h2>
                      <p className="text-sm text-muted-foreground">Busca un cliente existente o registra uno nuevo.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowNewCliente(true)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Nuevo cliente
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por nombre o teléfono..." 
                      className="pl-12 h-14 text-lg bg-card rounded-2xl shadow-sm border-primary/10"
                      value={clienteSearch} 
                      onChange={(e) => setClienteSearch(e.target.value)} 
                    />
                  </div>

                  <div className="grid gap-3">
                    {clientes.filter(c => 
                      c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) || 
                      (c.apellido && c.apellido.toLowerCase().includes(clienteSearch.toLowerCase())) ||
                      c.telefono.includes(clienteSearch)
                    ).map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => { setCliente(c); setStep(2); }}
                        className="flex items-center justify-between p-4 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
                      >
                        <div className="flex items-center gap-4 text-left">
                          <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center font-bold text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                            {c.nombre.charAt(0)}{c.apellido?.charAt(0) || ""}
                          </div>
                          <div>
                            <div className="font-bold text-lg">{c.nombre} {c.apellido || ""}</div>
                            <div className="text-sm text-muted-foreground">{c.telefono}</div>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                  <NewClienteDialog open={showNewCliente} onOpenChange={setShowNewCliente} tenantId={tenant.id} onCreated={(c) => { setCliente(c); setStep(2); }} />
                </div>
              ) : (
                <>
                  {/* SECCION SERVICIOS */}
                  {(activeCategory === "TODOS" || activeCategory === "Servicios" || posSearch) && servicesFiltered.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <div className="h-4 w-1 bg-primary rounded-full" />
                        Servicios
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {servicesFiltered.map(s => {
                          const sel = serviciosSel.includes(s.nombre);
                          return (
                            <button
                              key={s.id}
                              onClick={() => setServiciosSel((arr) => sel ? arr.filter((x) => x !== s.nombre) : [...arr, s.nombre])}
                              className={`group relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95 text-center ${
                                sel ? "border-primary bg-primary/10 shadow-glow" : "border-transparent bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-elegant"
                              }`}
                            >
                              {s.imagen_url ? (
                                <div className="h-24 w-24 rounded-2xl bg-white shadow-md overflow-hidden ring-2 ring-white/20">
                                  <img src={s.imagen_url} alt={s.nombre} className="h-full w-full object-cover" />
                                </div>
                              ) : (
                                <div className={`flex h-24 w-24 items-center justify-center rounded-2xl text-4xl transition-colors ${sel ? "bg-primary text-white" : "bg-accent/30"}`}>
                                  {s.icono || "🧺"}
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-bold leading-tight line-clamp-2">{s.nombre}</div>
                                {s.precio > 0 && <div className="mt-1 text-xs font-black text-primary">+{formatRD(s.precio)}</div>}
                              </div>
                              {sel && (
                                <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-glow">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}
                              <Badge className="absolute top-2 left-2 text-[7px] font-normal uppercase px-1.5 py-0 bg-primary text-white border-none shadow-sm pointer-events-none ring-1 ring-white/20">Servicio</Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECCIONES DE CATEGORIAS */}
                  {Array.from(new Set(catalogFiltered.map(c => c.categoria || "Otros"))).map(catName => {
                    const itemsInCat = catalogFiltered.filter(c => (c.categoria || "Otros") === catName);
                    if (itemsInCat.length === 0) return null;

                    return (
                      <div key={catName} className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <div className="h-4 w-1 bg-primary rounded-full" />
                          {catName}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                          {itemsInCat.map(item => (
                            <button
                              key={item.id}
                              onClick={() => addItem({ descripcion: item.nombre, cantidad: 1, precio_unitario: item.precio, es_libra: item.por_libra })}
                              className="group relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-elegant transition-all active:scale-95 text-center"
                            >
                              {item.imagen_url ? (
                                <div className="h-24 w-24 rounded-2xl bg-white shadow-md overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                  <img src={item.imagen_url} alt={item.nombre} className="h-full w-full object-cover" />
                                </div>
                              ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-accent/30 text-4xl group-hover:bg-primary/10 transition-colors">
                                  {item.icono || "👕"}
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-bold leading-tight line-clamp-2">{item.nombre}</div>
                                <div className="mt-1 text-xs font-black text-primary">{formatRD(item.precio)}</div>
                              </div>
                              {items.some(it => it.descripcion === item.nombre) && (
                                <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold shadow-glow animate-in zoom-in duration-200">
                                  {items.filter(it => it.descripcion === item.nombre).reduce((acc, it) => acc + it.cantidad, 0)}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* SIDEBAR ORDER */}
          <Card className="w-80 md:w-96 flex flex-col overflow-hidden border-2 border-primary/10 shadow-elegant rounded-3xl">
            {/* Header: Cliente */}
            <div className="p-4 border-b bg-accent/5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">Orden</div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => { setItems([]); setServiciosSel(["Lavado y secado"]); setCliente(null); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {!cliente && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => { setStep(1); }}>
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {cliente ? (
                <div className="flex items-center justify-between bg-background p-3 rounded-xl border border-primary/20 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold">
                      {cliente.nombre.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{cliente.nombre}</div>
                      <div className="text-[10px] text-muted-foreground">{cliente.telefono}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCliente(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="py-2">
                  <Button variant="outline" className="w-full justify-start h-12 bg-accent/20 border-primary/10 hover:bg-primary/5 hover:border-primary/30 transition-all rounded-xl" onClick={() => { setStep(1); }}>
                    <Search className="mr-2 h-3 w-3" /> Seleccionar cliente...
                  </Button>
                </div>
              )}
            </div>

            {/* List: Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {serviciosSel.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4 border-b border-primary/10 pb-3">
                  {serviciosSel.map(sName => (
                    <Badge key={sName} variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold py-0.5">
                      {sName}
                    </Badge>
                  ))}
                </div>
              )}
              {items.length === 0 && serviciosSel.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
                  <ShoppingCart className="h-10 w-10 mb-2" />
                  <p className="text-xs font-medium">Carrito vacío</p>
                </div>
              ) : (
                items.map((it, i) => (
                  <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border bg-accent/5 hover:bg-accent/10 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-bold line-clamp-1">{it.descripcion}</div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateItemQuantity(i, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-bold w-6 text-center">{it.cantidad}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateItemQuantity(i, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-sm font-black text-primary">{formatRD(it.cantidad * it.precio_unitario)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer: Totals & Button */}
            <div className="p-5 bg-primary/5 border-t border-primary/10 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground font-bold">
                  <span>SUBTOTAL</span>
                  <span>{formatRD(subtotalBruto)}</span>
                </div>
                {itbis > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground font-bold">
                    <span>ITBIS ({cfg.itbis_porcentaje}%)</span>
                    <span>{formatRD(itbis)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                  <span className="text-sm font-black uppercase">Total</span>
                  <span className="text-2xl font-black text-primary">{formatRD(total)}</span>
                </div>
              </div>
              <Button 
                disabled={items.length === 0 || !cliente} 
                className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-glow border-none transition-all active:scale-[0.98] mt-2"
                onClick={() => { setStep(5); }}
              >
                COBRAR <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <>
          <Stepper step={step} />

          <Card className="mt-6 p-6 md:p-8">
            <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              {step === 1 && (
                <>
                  <h2 className="mb-1 text-2xl font-display">Cliente</h2>
                  <p className="mb-5 text-sm text-muted-foreground">Busca por nombre o teléfono. Si no existe, créalo.</p>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={clienteSearch} onChange={(e) => setClienteSearch(e.target.value)} placeholder="Nombre o teléfono..." className="pl-10" />
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setShowNewCliente(true)}>
                      <UserPlus className="mr-1.5 h-4 w-4" /> Nuevo cliente
                    </Button>
                  </div>

                  <div className="mt-4 max-h-80 space-y-3 overflow-auto rounded-xl border border-border bg-accent/10 p-3">
                    {filtrados.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No se encontraron clientes</div>}
                    {filtrados.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCliente(c)}
                        className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all ${
                          cliente?.id === c.id 
                            ? "border-primary bg-primary/10 ring-1 ring-primary shadow-sm" 
                            : "border-border bg-card hover:border-primary/50 hover:bg-accent/30 hover:shadow-elegant"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${
                            cliente?.id === c.id ? "bg-primary text-white" : "bg-accent text-muted-foreground"
                          }`}>
                            {c.nombre.charAt(0)}{c.apellido?.charAt(0) || ""}
                          </div>
                          <div>
                            <div className="font-display text-base font-semibold">
                              {c.nombre} {c.apellido || ""}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" /> {c.telefono}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {c.tipo === "Empresa" ? (
                            <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-600">Empresa</Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Consumidor Final</Badge>
                          )}
                          {cliente?.id === c.id && <Check className="h-5 w-5 text-primary animate-in zoom-in duration-200" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  <NewClienteDialog open={showNewCliente} onOpenChange={setShowNewCliente} tenantId={tenant.id} onCreated={(c) => { setCliente(c); setShowNewCliente(false); }} />
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="mb-1 text-2xl font-display">Servicios</h2>
                  <p className="mb-5 text-sm text-muted-foreground">Selecciona los servicios incluidos en esta orden.</p>
                  {servicios.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                      No hay servicios. Agrégalos en <strong>Catálogo</strong>.
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {servicios.map((s) => {
                        const sel = serviciosSel.includes(s.nombre);
                        return (
                          <button key={s.id} onClick={() => setServiciosSel((arr) => sel ? arr.filter((x) => x !== s.nombre) : [...arr, s.nombre])}
                            className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition ${
                              sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                            }`}>
                            <div className={`flex h-5 w-5 items-center justify-center rounded border-2 ${sel ? "border-primary bg-primary text-white" : "border-border"}`}>
                              {sel && <Check className="h-3 w-3" />}
                            </div>
                            {s.imagen_url ? (
                              <img src={s.imagen_url} alt={s.nombre} className="h-8 w-8 rounded object-cover" />
                            ) : (
                              <span className="text-xl">{s.icono || "🧺"}</span>
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{s.nombre}</div>
                              {s.descripcion && <div className="text-[11px] text-muted-foreground">{s.descripcion}</div>}
                              {s.precio > 0 && <div className="text-[10px] font-bold text-primary">+{formatRD(s.precio)}</div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="mb-1 text-2xl font-display">Prendas y precios</h2>
                  <p className="mb-5 text-sm text-muted-foreground">Agrega cada prenda. Los precios vienen del catálogo y son editables.</p>

                  <div className="space-y-2">
                    {items.map((it, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated p-3">
                        <div className="flex-1">
                          <div className="font-medium">{it.descripcion}</div>
                          <div className="text-xs text-muted-foreground">
                            {it.es_libra ? `${it.cantidad} lb` : `${it.cantidad} unid.`} × {formatRD(it.precio_unitario)}
                            {it.notas ? ` · ${it.notas}` : ""}
                          </div>
                        </div>
                        <div className="font-display text-lg">{formatRD(it.cantidad * it.precio_unitario)}</div>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    ))}
                    {items.length === 0 && <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No hay prendas. Haz clic en "Agregar prenda".</div>}
                  </div>

                  <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm transition-all active:scale-95" onClick={() => setShowAddItem(true)}>
                    <Shirt className="mr-2 h-4 w-4" /> Agregar prenda
                  </Button>

                  <AddItemDialog 
                    open={showAddItem} 
                    onOpenChange={setShowAddItem} 
                    catalogo={catalogo} 
                    items={items}
                    onAdd={addItem} 
                    onUpdateQty={updateItemQuantity}
                  />
                </>
              )}

              {step === 4 && (
                <>
                  <h2 className="mb-1 text-2xl font-display">Resumen</h2>
                  <p className="mb-5 text-sm text-muted-foreground">Revisa precios, fecha de entrega y opciones.</p>

                  <div className="space-y-1 rounded-xl border border-border/60 bg-accent/5 p-4">
                    <div className="mb-3 flex items-center gap-2 border-b border-border/40 pb-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detalle de prendas</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((it, i) => (
                        <div key={i} className="flex justify-between items-center text-sm group">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{it.descripcion}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{it.cantidad} {it.es_libra ? "lb" : "unid."}</span>
                          </div>
                          <div className="font-display font-semibold text-foreground">
                            {formatRD(it.cantidad * it.precio_unitario)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div className="space-y-3">
                      <Field label="Fecha de entrega"><Input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} /></Field>
                      <Field label="Notas">
                        <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones..." rows={3} />
                      </Field>
                      <Field label="Descuento (RD$)"><Input type="number" value={descuento} onChange={(e) => setDescuento(Number(e.target.value) || 0)} /></Field>
                      
                      <div className="rounded-lg border border-border p-3 space-y-3 bg-accent/5">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Servicio a domicilio</span>
                          </div>
                          <Switch checked={servicioDomicilio} onCheckedChange={setServicioDomicilio} />
                        </label>

                        {servicioDomicilio && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                            <Field label="Dirección de entrega">
                              <Input 
                                value={direccionDomicilio} 
                                onChange={(e) => setDireccionDomicilio(e.target.value)} 
                                placeholder="Calle, No., Sector..."
                                className="bg-background"
                              />
                            </Field>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              Se guardará en la ficha del cliente si es nueva.
                            </p>
                          </motion.div>
                        )}
                      </div>

                      <label className="flex items-center gap-2 text-sm mt-2"><input type="checkbox" checked={esUrgente} onChange={(e) => setEsUrgente(e.target.checked)} /> Urgente (+{cfg.recargo_urgencia}%)</label>
                      {cfg.ncf_facturacion_activa && (
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={aplicarItbis} onChange={(e) => setAplicarItbis(e.target.checked)} /> Aplicar ITBIS {cfg.itbis_porcentaje}%</label>
                      )}
                    </div>

                    <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6">
                      <div className="space-y-4 text-center">
                        <div className="space-y-1">
                          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Subtotal prendas</div>
                          <div className="text-2xl font-display font-bold">{formatRD(subtotalBase)}</div>
                        </div>

                        {costoServicios > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Costo servicios</div>
                            <div className="text-2xl font-display font-bold text-primary/80">{formatRD(costoServicios)}</div>
                          </div>
                        )}

                        {esUrgente && (
                          <div className="text-xs font-bold text-warning uppercase">
                            + {formatRD(recargo)} Recargo Urgencia
                          </div>
                        )}

                        <div className="pt-4 border-t border-primary/20">
                          <div className="text-xs uppercase tracking-wider text-primary font-bold">Total a pagar</div>
                          <div className="mt-2 text-5xl font-display font-black text-primary animate-in zoom-in duration-300">
                            {formatRD(total)}
                          </div>
                        </div>

                        {descuento > 0 && (
                          <div className="text-sm font-bold text-destructive">
                            Descuento aplicado: -{formatRD(descuento)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 5 && (
                <>
                  <h2 className="mb-1 text-2xl font-display">Cobro</h2>
                  <p className="mb-5 text-sm text-muted-foreground">Selecciona el método de pago para el total de <strong className="text-foreground">{formatRD(total)}</strong></p>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { id: "EFECTIVO", label: "Efectivo", icon: "💵" },
                      { id: "TARJETA", label: "Tarjeta", icon: "💳" },
                      { id: "TRANSFERENCIA", label: "Transf.", icon: "🏦" },
                      { id: "CREDITO", label: "Crédito", icon: "📝" }
                    ].map((m) => (
                      <button key={m.id} onClick={() => setMetodo(m.id as MetodoPago)}
                        className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all active:scale-95 ${
                          metodo === m.id 
                            ? "border-primary bg-primary/5 ring-1 ring-primary" 
                            : "border-border bg-card hover:border-primary/40"
                        }`}>
                        <span className="text-2xl">{m.icon}</span>
                        <div className="font-bold text-sm uppercase tracking-tight">{m.label}</div>
                        {metodo === m.id && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />}
                      </button>
                    ))}
                  </div>

                  {metodo === "EFECTIVO" && (
                    <div className="mt-8 rounded-2xl border-2 border-border/60 bg-accent/5 p-6">
                      <div className="grid gap-6 md:grid-cols-2 items-center">
                        <Field label="Monto recibido">
                          <div className="relative h-24">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-2xl text-muted-foreground/50">RD$</span>
                            <Input
                              className="h-full pl-24 !text-5xl font-black font-display bg-background border-2 border-primary/20 focus-visible:ring-primary/30"
                              value={recibido ? formatAmountInput(String(recibido)) : ""}
                              onChange={(e) => setRecibido(parseAmount(e.target.value))}
                              placeholder="0.00"
                            />
                          </div>
                        </Field>

                        <div className={`flex flex-col items-center justify-center h-28 rounded-xl border-2 transition-all duration-300 ${
                          faltante > 0 
                            ? "bg-destructive/5 border-destructive/30 text-destructive animate-pulse" 
                            : "bg-emerald-500/5 border-emerald-500/30 text-emerald-600"
                        }`}>
                          <div className="text-xs font-black uppercase tracking-widest opacity-70">
                            {faltante > 0 ? "Faltante" : "Vuelto a entregar"}
                          </div>
                          <div className="text-4xl font-display font-black">
                            {formatRD(faltante > 0 ? faltante : vuelto)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {metodo === "CREDITO" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-6 flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 p-5 text-sm text-warning-foreground">
                      <AlertTriangle className="h-6 w-6 text-warning shrink-0" />
                      <div>
                        <strong className="block text-base">Venta a crédito</strong>
                        Esta orden se registrará como pendiente de cobro en el balance de <strong>{cliente?.nombre}</strong>.
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>

            <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Atrás
              </Button>
              {step < 5 ? (
                <Button onClick={next} className="bg-gradient-primary text-white shadow-elegant hover:opacity-95">
                  Continuar <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={onCrearOrden} className="bg-gradient-primary text-white shadow-elegant hover:opacity-95">
                  Confirmar y crear orden
                </Button>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Modal ticket */}
      <Dialog open={showTicket} onOpenChange={(o) => { setShowTicket(o); if (!o) navigate({ to: "/t/$slug/ordenes", params: { slug: tenant.slug } }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>✓ Orden creada — {creada?.numero}</DialogTitle>
          </DialogHeader>
          {creada && cliente && (
            <div className="max-h-[60vh] overflow-auto rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
              <Ticket orden={creada} tenant={tenant} empleado={empleado} cliente={cliente} formato={cfg.formato_ticket} pagoRecibido={metodo === "EFECTIVO" ? recibido : undefined} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => navigate({ to: "/t/$slug/ordenes", params: { slug: tenant.slug } })}>Cerrar</Button>
            <Button onClick={() => window.print()} className="bg-gradient-primary text-white"><Printer className="mr-1.5 h-4 w-4" /> Imprimir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PlanLimitModal 
        open={showLimitModal} 
        onOpenChange={setShowLimitModal} 
        type="orders" 
        limit={limits?.orderLimit ?? 0} 
        tenant={user.tenant} 
      />
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Cliente", "Servicios", "Prendas", "Resumen", "Cobro"];
  return (
    <div className="flex items-center gap-2">
      {labels.map((l, i) => {
        const n = i + 1;
        const done = step > n; const cur = step === n;
        return (
          <div key={l} className="flex flex-1 items-center">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              done ? "bg-success text-white" : cur ? "bg-gradient-primary text-white shadow-glow" : "bg-muted text-muted-foreground"
            }`}>{done ? <Check className="h-4 w-4" /> : n}</div>
            <div className={`ml-2 hidden text-xs sm:block ${cur ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{l}</div>
            {i < labels.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${done ? "bg-success" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1.5 block text-sm font-medium">{label}</Label>{children}</div>;
}
function Row({ k, v, className = "" }: { k: string; v: string; className?: string }) {
  return <div className={`flex justify-between text-sm ${className}`}><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}

// === New Cliente Dialog ===
function NewClienteDialog({ open, onOpenChange, tenantId, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; tenantId: string; onCreated: (c: Cliente) => void }) {
  const [f, setF] = useState({ nombre: "", apellido: "", telefono: "", email: "", direccion: "", tipo: "Consumidor Final" as Cliente["tipo"] });
  async function submit() {
    const isEmpresa = f.tipo === "Empresa";
    if (!f.nombre.trim()) { toast.error(isEmpresa ? "Nombre de empresa requerido" : "Nombre requerido"); return; }
    if (!isEmpresa && !f.apellido.trim()) { toast.error("Apellido requerido"); return; }
    if (f.telefono.replace(/\D/g, "").length < 10) { toast.error("Teléfono inválido"); return; }
    try {
      const c: Cliente = {
        id: uid("cli"), tenant_id: tenantId, nombre: f.nombre, apellido: f.apellido || undefined, telefono: f.telefono,
        email: f.email || undefined, direccion: f.direccion || undefined,
        tipo: f.tipo, limite_credito: 0, creado_en: new Date().toISOString(),
      };
      await saveCliente(c); 
      onCreated(c);
      setF({ nombre: "", apellido: "", telefono: "", email: "", direccion: "", tipo: "Consumidor Final" });
      toast.success("Cliente creado");
    } catch (err: any) {
      toast.error("Error al crear cliente");
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo cliente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de Cliente">
              <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as Cliente["tipo"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
                  <SelectItem value="Empresa">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Teléfono *"><Input value={f.telefono} onChange={(e) => setF({ ...f, telefono: formatPhoneRD(e.target.value) })} placeholder="809-555-0000" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={f.tipo === "Empresa" ? "col-span-2" : ""}>
              <Field label={f.tipo === "Empresa" ? "Nombre de la empresa *" : "Nombre *"}>
                <Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder={f.tipo === "Empresa" ? "Ej. Planix" : "Ej. Juan"} />
              </Field>
            </div>
            {f.tipo !== "Empresa" && (
              <Field label="Apellido *">
                <Input value={f.apellido} onChange={(e) => setF({ ...f, apellido: e.target.value })} placeholder="Ej. Pérez" />
              </Field>
            )}
          </div>
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Dirección"><Input value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-white">Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// === Add Item Dialog ===
function AddItemDialog({ 
  open, 
  onOpenChange, 
  catalogo, 
  items,
  onAdd,
  onUpdateQty
}: { 
  open: boolean; 
  onOpenChange: (o: boolean) => void; 
  catalogo: ReturnType<typeof getCatalogo>; 
  items: OrdenItem[];
  onAdd: (it: OrdenItem) => void;
  onUpdateQty: (i: number, d: number) => void;
}) {
  const [activeCat, setActiveCat] = useState<string>("TODOS");
  const [search, setSearch] = useState("");
  
  const categories = useMemo(() => {
    const cats = new Set(catalogo.map(c => c.categoria || "Otros"));
    return ["TODOS", ...Array.from(cats)];
  }, [catalogo]);

  const itemsFiltered = useMemo(() => {
    let list = catalogo;
    if (activeCat !== "TODOS") {
      list = list.filter(c => (c.categoria || "Otros") === activeCat);
    }
    if (search) {
      list = list.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()));
    }
    return list;
  }, [catalogo, activeCat, search]);

  useEffect(() => {
    if (open) {
      setActiveCat("TODOS");
      setSearch("");
    }
  }, [open]);

  function handleItemClick(it: CatalogoItem) {
    const existingIdx = items.findIndex(x => x.descripcion === it.nombre);
    if (existingIdx > -1) {
      onUpdateQty(existingIdx, 1);
    } else {
      onAdd({ descripcion: it.nombre, cantidad: 1, precio_unitario: it.precio, es_libra: it.por_libra });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden flex flex-col rounded-3xl">
        <DialogHeader className="p-6 pb-2 border-b border-border/50">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-2xl font-display font-bold">Seleccionar Prendas</DialogTitle>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre..." 
                className="pl-9 h-11 bg-accent/5 rounded-2xl border-primary/10 shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2 py-4 overflow-x-auto no-scrollbar">
            {categories.map(c => (
              <Button
                key={c}
                variant={activeCat === c ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCat(c)}
                className={`rounded-full px-5 h-9 text-xs font-bold uppercase tracking-tight transition-all ${
                  activeCat === c ? "bg-primary text-white shadow-glow" : "opacity-70 hover:opacity-100 bg-background"
                }`}
              >
                {c}
              </Button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-accent/5">
          {itemsFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground opacity-30">
              <Shirt className="h-16 w-16 mb-4" />
              <p className="font-medium">No se encontraron prendas</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {itemsFiltered.map((it) => {
                const count = items.filter(x => x.descripcion === it.nombre).reduce((acc, x) => acc + x.cantidad, 0);
                return (
                  <button
                    key={it.id}
                    onClick={() => handleItemClick(it)}
                    className={`group relative flex flex-col items-center justify-center gap-3 p-5 rounded-3xl border-2 transition-all active:scale-90 text-center ${
                      count > 0 
                        ? "border-primary bg-primary/5" 
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    {it.imagen_url ? (
                      <img src={it.imagen_url} alt={it.nombre} className={`h-16 w-16 rounded-2xl object-cover shadow-sm transition-all duration-300 ${count > 0 ? "scale-110 ring-4 ring-primary/20" : "group-hover:scale-105"}`} />
                    ) : (
                      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl transition-all duration-300 ${count > 0 ? "bg-primary text-white scale-110 shadow-glow" : "bg-accent/30 group-hover:bg-primary/10"}`}>
                        {it.icono || "👕"}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold leading-tight line-clamp-1">{it.nombre}</div>
                      <div className="mt-1 text-xs font-black text-primary">{formatRD(it.precio)}</div>
                    </div>
                    
                    {count > 0 && (
                      <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-black shadow-glow animate-in zoom-in duration-300 ring-4 ring-background">
                        {count}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-background border-t border-border/50">
          <Button onClick={() => onOpenChange(false)} className="w-full md:w-auto px-12 h-12 text-lg font-bold bg-primary text-white rounded-2xl shadow-glow">
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
