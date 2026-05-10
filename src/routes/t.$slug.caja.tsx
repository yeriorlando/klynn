import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Wallet, Lock, ArrowDownLeft, ArrowUpRight, AlertTriangle, Plus, CheckCircle2 } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCajaAbierta, getCajas, getMovimientos, saveCaja, saveMovimiento,
  formatRD, formatDateTimeRD, uid, CATEGORIAS_GASTOS,
  formatAmountInput, parseAmount,
  type Caja, type TipoMovimiento, type MetodoPago,
} from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/t/$slug/caja")({
  component: CajaPage,
});

function CajaPage() {
  const user = useRequireAuth();
  const [refresh, setRefresh] = useState(0);
  const [showApertura, setShowApertura] = useState(false);
  const [showMov, setShowMov] = useState<TipoMovimiento | null>(null);
  const [showCierre, setShowCierre] = useState(false);

  const [caja, setCaja] = useState<Caja | undefined>(undefined);
  const [todas, setTodas] = useState<Caja[]>([]);
  const [movs, setMovs] = useState<MovimientoCaja[]>([]);
  const [loading, setLoading] = useState(true);

  const tenant = user?.tenant;
  const empleado = user?.empleado;
  const tenantId = tenant?.id || '';

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [activeCaja, list, mList] = await Promise.all([
        getCajaAbierta(tenantId),
        getCajas(tenantId),
        getCajaAbierta(tenantId).then(c => c ? getMovimientos(tenantId, c.id) : [])
      ]);
      setCaja(activeCaja);
      setTodas(list);
      setMovs(mList);
      setLoading(false);
    }
    load();
  }, [tenantId, refresh]);

  const ventasEf = movs.filter((m) => m.tipo === "VENTA" && m.metodo === "EFECTIVO").reduce((s, m) => s + m.monto, 0);
  const ventasTar = movs.filter((m) => m.tipo === "VENTA" && m.metodo === "TARJETA").reduce((s, m) => s + m.monto, 0);
  const ventasTrans = movs.filter((m) => m.tipo === "VENTA" && m.metodo === "TRANSFERENCIA").reduce((s, m) => s + m.monto, 0);
  const otrosIng = movs.filter((m) => m.tipo === "INGRESO" || m.tipo === "ABONO").reduce((s, m) => s + m.monto, 0) - (caja?.monto_inicial || 0);
  const egresos = movs.filter((m) => ["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo)).reduce((s, m) => s + m.monto, 0);
  const efectivoEsperado = (caja?.monto_inicial || 0) + ventasEf + otrosIng - egresos;

  if (!user || user.tenant.id === '__loading__') return null;

  return (
    <div>
      <PageHeader title="Caja" description="Apertura, movimientos del turno y cierre con cuadre.">
        {!caja ? (
          <Button onClick={() => setShowApertura(true)} className="bg-gradient-primary text-white"><Wallet className="mr-1.5 h-4 w-4" /> Abrir caja</Button>
        ) : (
          <Button onClick={() => setShowCierre(true)} variant="outline"><Lock className="mr-1.5 h-4 w-4" /> Cerrar caja</Button>
        )}
      </PageHeader>

      {!caja && (
        <Card className="p-12 text-center">
          <Wallet className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="font-display text-2xl">No hay caja abierta</h3>
          <p className="mt-1 text-sm text-muted-foreground">Abre la caja para comenzar el turno.</p>
          <Button onClick={() => setShowApertura(true)} className="mt-5 bg-gradient-primary text-white">Abrir caja ahora</Button>
        </Card>
      )}

      {caja && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPI t="Efectivo en caja" v={formatRD(efectivoEsperado)} accent />
            <KPI t="Ventas efectivo" v={formatRD(ventasEf)} />
            <KPI t="Ventas tarjeta" v={formatRD(ventasTar)} />
            <KPI t="Ventas transferencia" v={formatRD(ventasTrans)} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-5">
              <div className="text-xs uppercase text-muted-foreground">Apertura</div>
              <div className="mt-1 font-display text-xl">{formatRD(caja.monto_inicial)}</div>
              <div className="text-xs text-muted-foreground">{formatDateTimeRD(caja.abierta_en)}</div>
              <div className="mt-2 text-xs text-muted-foreground">Empleado: <span className="font-bold text-foreground">{empleado.nombre}</span></div>
              {caja.notas_apertura && (
                <div className="mt-3">
                  {/mañana/i.test(caja.notas_apertura) ? (
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/20 gap-1.5 py-1 px-3 font-bold">
                      🌅 Turno: Mañana
                    </Badge>
                  ) : /tarde/i.test(caja.notas_apertura) ? (
                    <Badge variant="outline" className="bg-sky-500/10 text-sky-700 border-sky-500/20 gap-1.5 py-1 px-3 font-bold">
                      ☀️ Turno: Tarde
                    </Badge>
                  ) : /noche/i.test(caja.notas_apertura) ? (
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 border-indigo-500/20 gap-1.5 py-1 px-3 font-bold">
                      🌙 Turno: Noche
                    </Badge>
                  ) : (
                    <div className="rounded bg-surface-elevated p-2 text-xs">{caja.notas_apertura}</div>
                  )}
                </div>
              )}
            </Card>
            <Card className="p-5">
              <div className="text-xs uppercase text-muted-foreground">Acciones rápidas</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowMov("INGRESO")}><ArrowDownLeft className="mr-1.5 h-3.5 w-3.5" /> Ingreso</Button>
                <Button variant="outline" size="sm" onClick={() => setShowMov("EGRESO")}><ArrowUpRight className="mr-1.5 h-3.5 w-3.5" /> Egreso</Button>
                <Button variant="outline" size="sm" onClick={() => setShowMov("RETIRO")}>Retiro</Button>
                <Button variant="outline" size="sm" onClick={() => setShowMov("GASTO_CAJA_CHICA")}>Caja chica</Button>
              </div>
            </Card>
            <Card className="p-5">
              <div className="text-xs uppercase text-muted-foreground">Resumen del turno</div>
              <div className="mt-2 space-y-1 text-sm">
                <Row k="Movimientos" v={String(movs.length)} />
                <Row k="Otros ingresos" v={formatRD(otrosIng)} />
                <Row k="Egresos / gastos" v={formatRD(egresos)} className="text-destructive" />
                <div className="border-t border-border pt-1.5"><Row k="Total esperado" v={formatRD(efectivoEsperado)} bold /></div>
              </div>
            </Card>
          </div>

          <Card className="mt-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-display text-lg">Movimientos del turno</h3>
              <Badge variant="outline">{movs.length}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Hora</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Concepto</th>
                    <th className="px-4 py-3 text-left">Método</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {[...movs].reverse().map((m) => (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-accent/30">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(m.creado_en).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-4 py-2.5">
                        {m.tipo === "VENTA" && (
                          <Badge className="bg-success text-white hover:bg-success/90 border-none gap-1 font-bold">
                            <Plus className="h-3 w-3" /> VENTA
                          </Badge>
                        )}
                        {m.tipo === "INGRESO" && (
                          <Badge className="bg-success text-white hover:bg-success/90 border-none gap-1 font-bold">
                            <ArrowDownLeft className="h-3 w-3" /> INGRESO
                          </Badge>
                        )}
                        {(m.tipo === "EGRESO" || m.tipo === "RETIRO" || m.tipo === "GASTO_CAJA_CHICA") && (
                          <Badge className="bg-destructive text-white hover:bg-destructive/90 border-none gap-1 font-bold">
                            <ArrowUpRight className="h-3 w-3" /> {m.tipo.replace("_", " ")}
                          </Badge>
                        )}
                        {m.tipo === "ABONO" && (
                          <Badge className="bg-blue-600 text-white hover:bg-blue-700 border-none gap-1 font-bold">
                            <Plus className="h-3 w-3" /> ABONO
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {m.concepto.startsWith("Reembolso:") ? (
                          <>
                            <span className="font-bold">Reembolso:</span>
                            {m.concepto.substring("Reembolso:".length)}
                          </>
                        ) : (
                          m.concepto
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs">{m.metodo || "—"}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo) ? "text-destructive" : "text-success"}`}>
                        {["EGRESO", "RETIRO", "GASTO_CAJA_CHICA"].includes(m.tipo) ? "−" : "+"}{formatRD(m.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Histórico */}
      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-border p-4"><h3 className="font-display text-lg">Histórico de cierres</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Apertura</th>
                <th className="px-4 py-3 text-left">Cierre</th>
                <th className="px-4 py-3 text-right">Inicial</th>
                <th className="px-4 py-3 text-right">Esperado</th>
                <th className="px-4 py-3 text-right">Contado</th>
                <th className="px-4 py-3 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {todas.filter((c) => c.estado === "CERRADA").map((c) => (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="px-4 py-2.5 text-xs">{formatDateTimeRD(c.abierta_en)}</td>
                  <td className="px-4 py-2.5 text-xs">{c.cerrada_en && formatDateTimeRD(c.cerrada_en)}</td>
                  <td className="px-4 py-2.5 text-right">{formatRD(c.monto_inicial)}</td>
                  <td className="px-4 py-2.5 text-right">{formatRD(c.monto_esperado_efectivo || 0)}</td>
                  <td className="px-4 py-2.5 text-right">{formatRD(c.monto_contado_efectivo || 0)}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${(c.diferencia || 0) === 0 ? "" : (c.diferencia || 0) < 0 ? "text-destructive" : "text-success"}`}>
                    {formatRD(c.diferencia || 0)}
                  </td>
                </tr>
              ))}
              {todas.filter((c) => c.estado === "CERRADA").length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Sin cierres aún</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <AperturaDialog open={showApertura} onOpenChange={setShowApertura} tenantId={tenant.id} empleadoId={empleado.id} onDone={() => setRefresh((r) => r + 1)} />
      <MovDialog tipo={showMov} onClose={() => setShowMov(null)} caja={caja} empleadoId={empleado.id} tenantId={tenant.id} onDone={() => setRefresh((r) => r + 1)} />
      <CierreDialog
        open={showCierre}
        onOpenChange={setShowCierre}
        caja={caja}
        efectivoEsperado={efectivoEsperado}
        ventasTar={ventasTar}
        ventasTrans={ventasTrans}
        umbral={tenant.config?.umbral_diferencia_caja || 100}
        empleadoPin={empleado.pin}
        onDone={() => setRefresh((r) => r + 1)}
      />
    </div>
  );
}

function KPI({ t, v, accent }: { t: string; v: string; accent?: boolean }) {
  return (
    <Card className={`p-5 ${accent ? "bg-gradient-primary text-white" : ""}`}>
      <div className={`text-xs uppercase ${accent ? "text-white/80" : "text-muted-foreground"}`}>{t}</div>
      <div className="mt-1 font-display text-2xl">{v}</div>
    </Card>
  );
}
function Row({ k, v, bold, className = "" }: { k: string; v: string; bold?: boolean; className?: string }) {
  return <div className={`flex justify-between ${bold ? "font-bold" : ""} ${className}`}><span className="text-muted-foreground">{k}</span><span>{v}</span></div>;
}

function AmountField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[12px] font-black uppercase tracking-widest text-foreground px-1 text-center w-full">{label}</Label>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-sm font-bold text-primary/30 group-focus-within:text-primary/50 transition-colors">RD$</div>
        <Input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(formatAmountInput(e.target.value))}
          onBlur={() => {
            const n = parseAmount(value);
            if (n === 0) onChange("");
            else onChange(n.toLocaleString("en-US", { minimumFractionDigits: 2 }));
          }}
          placeholder="0.00"
          className="h-16 pl-14 pr-6 text-right font-display text-3xl md:text-4xl font-bold text-primary rounded-2xl border-2 border-slate-200 bg-slate-50/50 shadow-sm focus-visible:ring-primary/20 focus-visible:border-primary transition-all placeholder:text-slate-300"
        />
      </div>
    </div>
  );
}

function AperturaDialog({ open, onOpenChange, tenantId, empleadoId, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; tenantId: string; empleadoId: string; onDone: () => void }) {
  const [montoStr, setMontoStr] = useState<string>("");
  const [turno, setTurno] = useState<"Mañana" | "Tarde" | "Noche">("Mañana");
  async function submit() {
    const monto = parseAmount(montoStr);
    if (monto <= 0) { toast.error("Monto inválido"); return; }
    try {
      const cajaId = uid("caj");
      await saveCaja({ id: cajaId, tenant_id: tenantId, empleado_id: empleadoId, monto_inicial: monto, estado: "ABIERTA", abierta_en: new Date().toISOString(), notas_apertura: `Turno: ${turno}` });
      await saveMovimiento({ id: uid("mov"), tenant_id: tenantId, caja_id: cajaId, empleado_id: empleadoId, tipo: "INGRESO", concepto: "Apertura de caja", monto, creado_en: new Date().toISOString() });
      toast.success("Caja abierta 🔓"); onDone(); onOpenChange(false); setMontoStr("");
    } catch (err: any) {
      toast.error("Error al abrir caja");
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Abrir caja</DialogTitle></DialogHeader>
        <div className="space-y-6 py-4">
          <div className="text-center">
            <Label className="mb-3 block text-sm font-semibold uppercase tracking-wider text-muted-foreground">Monto inicial en efectivo</Label>
            <div className="relative mx-auto max-w-[280px] group">
              <div className="absolute inset-0 bg-primary/5 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <div className="relative flex flex-col items-center rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-5 shadow-sm transition-all group-focus-within:border-primary group-focus-within:bg-white group-focus-within:shadow-xl">
                <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-primary/40">Monto inicial en caja</div>
                <div className="flex w-full items-baseline justify-center gap-2">
                  <span className="font-display text-xl font-bold text-primary/20">RD$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={montoStr}
                    onChange={(e) => setMontoStr(formatAmountInput(e.target.value))}
                    placeholder="0.00"
                    className="w-full min-w-0 bg-transparent text-center font-display text-5xl font-bold text-primary outline-none placeholder:text-primary/5 tracking-tighter"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-4 block text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">Selecciona el turno</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "Mañana", icon: "🌅", color: "from-orange-400 to-yellow-200" },
                { id: "Tarde", icon: "☀️", color: "from-blue-400 to-cyan-200" },
                { id: "Noche", icon: "🌙", color: "from-indigo-600 to-purple-400" },
              ].map((t) => {
                const sel = turno === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTurno(t.id as any)}
                    className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 p-4 transition-all duration-300 ${
                      sel ? "border-primary bg-primary/5 scale-105 shadow-md" : "border-slate-100 bg-white hover:border-slate-200"
                    }`}
                  >
                    <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-2xl shadow-sm transition-transform group-hover:scale-110 ${t.color}`}>
                      {t.icon}
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-widest ${sel ? "text-primary" : "text-slate-400"}`}>
                      {t.id}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-white">Abrir caja</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovDialog({ tipo, onClose, caja, empleadoId, tenantId, onDone }: { tipo: TipoMovimiento | null; onClose: () => void; caja: Caja | undefined; empleadoId: string; tenantId: string; onDone: () => void }) {
  const [concepto, setConcepto] = useState("");
  const [montoStr, setMontoStr] = useState<string>("");
  const monto = parseAmount(montoStr);
  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_GASTOS[0]);

  async function submit() {
    if (!caja) return;
    if (!concepto.trim()) { toast.error("Concepto requerido"); return; }
    if (monto <= 0) { toast.error("Monto inválido ⚠️"); return; }
    try {
      await saveMovimiento({
        id: uid("mov"), tenant_id: tenantId, caja_id: caja.id, empleado_id: empleadoId,
        tipo: tipo!, concepto: tipo === "GASTO_CAJA_CHICA" ? `${categoria}: ${concepto}` : concepto,
        monto, metodo, creado_en: new Date().toISOString(),
      });
      toast.success("Movimiento registrado 💸"); onDone(); onClose(); setConcepto(""); setMontoStr("");
    } catch (err: any) {
      toast.error("Error al registrar movimiento");
    }
  }

  const labels: Record<TipoMovimiento, string> = { INGRESO: "Ingreso extra", EGRESO: "Egreso", RETIRO: "Retiro de caja", GASTO_CAJA_CHICA: "Gasto de caja chica", VENTA: "Venta", ABONO: "Abono" };

  return (
    <Dialog open={!!tipo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{tipo && labels[tipo]}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {tipo === "GASTO_CAJA_CHICA" && (
            <div><Label className="mb-1.5 block">Categoría</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS_GASTOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div><Label className="mb-1.5 block">Concepto</Label><Input value={concepto} onChange={(e) => setConcepto(e.target.value)} /></div>
          <div>
            <Label className="mb-1.5 block">Monto</Label>
            <div className="relative group">
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 flex items-center justify-center px-4 border-r border-slate-200 bg-slate-50/50 rounded-l-xl transition-colors group-focus-within:border-primary/30 group-focus-within:bg-primary/5">
                <span className="text-xs font-bold text-primary/60">RD$</span>
              </div>
              <Input
                inputMode="decimal"
                value={montoStr}
                onChange={(e) => setMontoStr(formatAmountInput(e.target.value))}
                placeholder="0.00"
                className="h-14 pl-20 pr-4 text-right font-display text-2xl text-primary tracking-tighter rounded-xl border-slate-200 bg-white shadow-sm focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
              />
            </div>
          </div>
          <div><Label className="mb-1.5 block">Método</Label>
            <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPago)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                <SelectItem value="TARJETA">Tarjeta</SelectItem>
                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-white">Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CierreDialog({ open, onOpenChange, caja, efectivoEsperado, ventasTar, ventasTrans, umbral, empleadoPin, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; caja: Caja | undefined;
  efectivoEsperado: number; ventasTar: number; ventasTrans: number; umbral: number; empleadoPin?: string; onDone: () => void;
}) {
  const [contadoEfStr, setContadoEfStr] = useState<string>("");
  const [contadoTarStr, setContadoTarStr] = useState<string>("");
  const [contadoTransStr, setContadoTransStr] = useState<string>("");
  const [notas, setNotas] = useState("");
  const [pin, setPin] = useState("");
  const [showNotas, setShowNotas] = useState(false);

  const contadoEf = parseAmount(contadoEfStr);
  const contadoTar = parseAmount(contadoTarStr);
  const contadoTrans = parseAmount(contadoTransStr);

  const totalEsperado = efectivoEsperado + ventasTar + ventasTrans;
  const totalContado = contadoEf + contadoTar + contadoTrans;
  const dif = +(totalContado - totalEsperado).toFixed(2);

  async function submit() {
    if (!caja) return;
    if (empleadoPin && pin !== empleadoPin) { toast.error("PIN incorrecto. No puedes cerrar la caja ❌"); return; }
    if (Math.abs(dif) > umbral && notas.length < 5) { toast.error("Diferencia mayor al umbral. Indica una nota explicativa ⚠️"); return; }
    if (pin.length < 4) { toast.error("PIN requerido para cerrar ⚠️"); return; }
    try {
      await saveCaja({
        ...caja, estado: "CERRADA", cerrada_en: new Date().toISOString(),
        monto_esperado_efectivo: efectivoEsperado,
        monto_contado_efectivo: contadoEf,
        monto_contado_tarjeta: contadoTar,
        monto_contado_transferencia: contadoTrans,
        diferencia: dif, notas_cierre: notas || undefined,
      });
      toast.success("Caja cerrada 🔒"); onDone(); onOpenChange(false);
    } catch (err: any) {
      toast.error("Error al cerrar caja");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Cerrar caja — Cuadre</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <div className="rounded-2xl bg-primary/5 p-6 text-center border-2 border-primary/10">
            <div className="text-[10px] uppercase font-bold tracking-widest text-primary/60 mb-1">Efectivo esperado en caja</div>
            <div className="font-display text-4xl text-primary font-bold">{formatRD(efectivoEsperado)}</div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <AmountField label="💵 EFECTIVO CONTADO" value={contadoEfStr} onChange={setContadoEfStr} />
            <AmountField label="💳 TARJETA" value={contadoTarStr} onChange={setContadoTarStr} />
            <AmountField label="🏦 TRANSFERENCIA" value={contadoTransStr} onChange={setContadoTransStr} />
          </div>
          <div className={`rounded-xl px-4 py-3 border-2 transition-colors ${dif === 0 ? "bg-emerald-50 border-emerald-100" : dif < 0 ? "bg-rose-50 border-rose-100" : "bg-amber-50 border-amber-100"}`}>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className={`text-[10px] font-black uppercase tracking-widest ${dif === 0 ? "text-emerald-700" : dif < 0 ? "text-rose-700" : "text-amber-700"}`}>
                  {dif === 0 ? "Caja cuadrada ✓" : dif < 0 ? "Faltante en caja" : "Sobrante en caja"}
                </div>
                {Math.abs(dif) > umbral && (
                  <div className={`mt-0.5 flex items-center gap-1 text-[10px] font-bold ${dif < 0 ? "text-rose-600/70" : "text-amber-600/70"}`}>
                    <AlertTriangle className="h-3 w-3" /> Excede umbral ({formatRD(umbral)})
                  </div>
                )}
              </div>
              <div className={`text-2xl font-display font-black ${dif === 0 ? "text-emerald-700" : dif < 0 ? "text-rose-700" : "text-amber-700"}`}>
                {formatRD(Math.abs(dif))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-accent/5 px-4 py-2">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">¿Añadir nota o explicación?</span>
                <span className="text-[10px] text-muted-foreground italic">Solo si hubo alguna novedad en el cuadre</span>
              </div>
              <Switch checked={showNotas} onCheckedChange={setShowNotas} />
            </div>

            <AnimatePresence>
              {showNotas && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Textarea 
                    value={notas} 
                    onChange={(e) => setNotas(e.target.value)} 
                    rows={2} 
                    placeholder="Escribe aquí cualquier observación sobre el cuadre..."
                    className="bg-accent/5 border-border/60 focus:bg-background transition-colors"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <Label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-1">PIN / firma del empleado</Label>
            <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" className="h-12 text-center text-2xl tracking-[0.5em] rounded-xl border-2 border-slate-100 bg-slate-50/50" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-white"><CheckCircle2 className="mr-1.5 h-4 w-4" /> Cerrar caja</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
