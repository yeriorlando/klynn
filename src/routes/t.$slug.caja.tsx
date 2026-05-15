import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Wallet, Lock, ArrowDownLeft, ArrowUpRight, AlertTriangle, Plus, CheckCircle2, Printer, Search, FileText } from "lucide-react";
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
  formatAmountInput, parseAmount, getHistoricoCierres, getEmpleados, getOrdenesByPeriod,
  type Caja, type TipoMovimiento, type MetodoPago, type Empleado, type Orden, type Tenant, type MovimientoCaja, type ECFConfig, type ECFDocument
} from "@/lib/storage";
import { getECFConfig, getECFDocuments, registerTenantInPronesoft } from "@/lib/fiscal";
import { useCajaAbierta, useCajas, useMovimientos, useECFConfig, useECFDocuments } from "@/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart3, Rocket, Activity, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/t/$slug/caja")({
  component: CajaPage,
});

function CajaPage() {
  const user = useRequireAuth();
  const queryClient = useQueryClient();
  const tenant = user?.tenant;
  const empleado = user?.empleado;
  const tenantId = tenant?.id || '';

  const [showApertura, setShowApertura] = useState(false);
  const [showMov, setShowMov] = useState<TipoMovimiento | null>(null);
  const [showCierre, setShowCierre] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [showCuadre, setShowCuadre] = useState(false);

  const { data: caja, isLoading: loadingCaja } = useCajaAbierta(tenantId);
  const { data: todas = [], isLoading: loadingTodas } = useCajas(tenantId);
  const { data: movs = [], isLoading: loadingMovs } = useMovimientos(tenantId, caja?.id);
  const { data: fiscalConfigData } = useECFConfig(tenantId);
  const { data: fiscalDocs = [] } = useECFDocuments(tenantId);

  const fiscalConfig = fiscalConfigData || null;
  const loading = loadingCaja || loadingTodas || (!!caja && loadingMovs);

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
        <div className="flex items-center gap-2">
          <FiscalSummary config={fiscalConfig} docs={fiscalDocs} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['ecf-config', tenantId] })} />
          {!caja ? (
            <Button onClick={() => setShowApertura(true)} className="bg-gradient-primary text-white"><Wallet className="mr-1.5 h-4 w-4" /> Abrir caja</Button>
          ) : (
            <Button onClick={() => setShowCierre(true)} variant="outline"><Lock className="mr-1.5 h-4 w-4" /> Cerrar caja</Button>
          )}
        </div>
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
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-display text-lg">Histórico de cierres</h3>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => setShowCuadre(true)}
              className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 shadow-sm transition-all gap-1.5 px-4"
            >
              <FileText className="h-4 w-4" /> 
              <span className="font-bold">Imprimir Cuadre</span>
            </Button>
            <Button 
              size="sm" 
              onClick={() => setShowHistorico(true)}
              className="bg-gradient-primary text-white shadow-sm hover:shadow-md transition-all gap-1.5 px-4"
            >
              <Printer className="h-4 w-4" /> 
              <span className="font-bold">Imprimir Cierres</span>
            </Button>
          </div>
        </div>
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
        tenant={tenant}
        empleadoName={`${empleado.nombre} ${empleado.apellido}`}
        efectivoEsperado={efectivoEsperado}
        ventasTar={ventasTar}
        ventasTrans={ventasTrans}
        umbral={tenant.config?.umbral_diferencia_caja || 100}
        empleadoPin={empleado.pin}
        empleadoRol={empleado.rol}
        onDone={() => setRefresh((r) => r + 1)}
      />
      <HistoricoCierresDialog
        open={showHistorico}
        onOpenChange={setShowHistorico}
        tenant={tenant}
        empleadoId={empleado?.id}
      />
      <HistoricoCuadreDialog
        open={showCuadre}
        onOpenChange={setShowCuadre}
        tenant={tenant}
        empleadoId={empleado?.id}
      />
    </div>
  );
}


function FiscalSummary({ config, docs, onRefresh }: { config: ECFConfig | null; docs: ECFDocument[]; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showResumen, setShowResumen] = useState(false);

  // Calcular métricas del mes actual
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const docsMes = docs.filter(d => new Date(d.fecha_emision) >= inicioMes);
  const totalEmitido = docsMes.reduce((s, d) => s + d.monto_total, 0);
  const count = docsMes.length;

  // Lógica de Registro Automatizado
  async function handleRegister() {
    if (!config) return;
    setLoading(true);
    try {
      await registerTenantInPronesoft(config.tenant_id);
      toast.success("¡Registro fiscal completado exitosamente! 🚀");
      onRefresh();
    } catch (err: any) {
      toast.error("Error al registrar: " + (err.message || "Servicio no disponible"));
    } finally {
      setLoading(false);
    }
  }

  // Si no está configurado, mostrar el botón de "Cohete" para registro rápido
  if (!config?.pronesoft_tenant_id) {
    return (
      <Button 
        variant="outline" 
        onClick={handleRegister} 
        disabled={loading || !config}
        className="border-primary/30 text-primary hover:bg-primary/5 gap-2 font-bold shadow-sm"
      >
        <Rocket className={`h-4 w-4 ${loading ? 'animate-bounce' : ''}`} /> 
        {loading ? "Configurando..." : "Activar Fiscal"}
      </Button>
    );
  }

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setShowResumen(true)} 
        className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 gap-2 font-bold shadow-sm"
      >
        <BarChart3 className="h-4 w-4" /> Resumen Fiscal
      </Button>

      <Dialog open={showResumen} onOpenChange={setShowResumen}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-elegant">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 p-2.5 rounded-2xl text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-display font-black">Resumen Fiscal</DialogTitle>
                <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Mes actual: {hoy.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-muted/30 p-4 border border-border/50">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Documentos</div>
                <div className="text-2xl font-display font-black">{count}</div>
              </div>
              <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
                <div className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">Total Emitido</div>
                <div className="text-2xl font-display font-black text-primary">{formatRD(totalEmitido)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Actividad Mensual</div>
                <div className="text-xs font-bold text-emerald-600">{count > 0 ? 'Saludable' : 'Sin actividad'}</div>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/30">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: count > 0 ? '100%' : '0%' }}
                  transition={{ duration: 1 }}
                  className="h-full bg-emerald-500" 
                />
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-500/5 p-4 flex items-center gap-3 border border-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="text-xs text-emerald-800 leading-tight">
                Tu integración con <span className="font-bold">Pronesoft e-CF</span> está activa y enviando datos correctamente a la DGII.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button className="w-full rounded-2xl bg-slate-900 text-white font-bold" onClick={() => setShowResumen(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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

function CierreDialog({ open, onOpenChange, caja, tenant, empleadoName, efectivoEsperado, ventasTar, ventasTrans, umbral, empleadoPin, empleadoRol, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; caja: Caja | undefined;
  tenant: Tenant; empleadoName: string;
  efectivoEsperado: number; ventasTar: number; ventasTrans: number; umbral: number; empleadoPin?: string; empleadoRol?: string; onDone: () => void;
}) {
  const [contadoEfStr, setContadoEfStr] = useState<string>("");
  const [contadoTarStr, setContadoTarStr] = useState<string>("");
  const [contadoTransStr, setContadoTransStr] = useState<string>("");
  const [notas, setNotas] = useState("");
  const [pin, setPin] = useState("");
  const [showNotas, setShowNotas] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [closedCaja, setClosedCaja] = useState<Caja | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [showPrint, setShowPrint] = useState(false);

  const contadoEf = parseAmount(contadoEfStr);
  const contadoTar = parseAmount(contadoTarStr);
  const contadoTrans = parseAmount(contadoTransStr);

  const totalEsperado = efectivoEsperado + ventasTar + ventasTrans;
  const totalContado = contadoEf + contadoTar + contadoTrans;
  const dif = +(totalContado - totalEsperado).toFixed(2);

  async function submit() {
    if (!caja) return;
    
    // Validar PIN solo si NO es ADMIN
    if (empleadoRol !== "ADMIN") {
      if (pin.length < 4) { toast.error("PIN requerido para cerrar ⚠️"); return; }
      if (empleadoPin && pin !== empleadoPin) { toast.error("PIN incorrecto. No puedes cerrar la caja ❌"); return; }
    }
    
    if (Math.abs(dif) > umbral && notas.length < 5) { toast.error("Diferencia mayor al umbral. Indica una nota explicativa ⚠️"); return; }
    
    try {
      const updatedCaja = {
        ...caja, estado: "CERRADA", cerrada_en: new Date().toISOString(),
        monto_esperado_efectivo: efectivoEsperado,
        monto_contado_efectivo: contadoEf,
        monto_contado_tarjeta: contadoTar,
        monto_contado_transferencia: contadoTrans,
        diferencia: dif, notas_cierre: notas || undefined,
      } as Caja;
      await saveCaja(updatedCaja);
      setClosedCaja(updatedCaja);
      toast.success("Caja cerrada 🔒");
      setShowSuccess(true);
      onDone();
    } catch (err: any) {
      console.error(err);
      toast.error("Error al cerrar caja: " + (err?.message || JSON.stringify(err)));
    }
  }

  async function handlePrint() {
    if (!closedCaja) return;
    setLoadingOrders(true);
    // Fetch orders for this specific caja period
    const data = await getOrdenesByPeriod({ 
      tenant_id: closedCaja.tenant_id, 
      desde: closedCaja.abierta_en, 
      hasta: closedCaja.cerrada_en || new Date().toISOString() 
    });
    setOrdenes(data);
    setLoadingOrders(false);
    setShowPrint(true);
  }

  if (showPrint && closedCaja) {
    return (
      <ReporteCuadreThermal 
        ordenes={ordenes} 
        tenant={tenant} 
        empleadoName={empleadoName}
        rango={`${formatDateTimeRD(closedCaja.abierta_en)} - ${formatDateTimeRD(closedCaja.cerrada_en!)}`}
        formato={tenant.config?.formato_ticket || "80mm"}
        onBack={() => { setShowPrint(false); onOpenChange(false); }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!showSuccess) onOpenChange(v); }}>
      <DialogContent className={`transition-all duration-300 ${showSuccess ? "max-w-md" : "max-w-2xl"}`}>
        <AnimatePresence mode="wait">
          {!showSuccess ? (
            <motion.div
              key="cierre-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
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

                {empleadoRol !== "ADMIN" && (
                  <div>
                    <Label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-1">PIN / firma del empleado</Label>
                    <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" className="h-12 text-center text-2xl tracking-[0.5em] rounded-xl border-2 border-slate-100 bg-slate-50/50" />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button onClick={submit} className="bg-gradient-primary text-white"><CheckCircle2 className="mr-1.5 h-4 w-4" /> Cerrar caja</Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="cierre-success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-4 text-center space-y-4"
            >
              <div className="flex justify-center">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm border-4 border-white ring-4 ring-emerald-50/50">
                  <Wallet className="h-8 w-8" />
                  <div className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1 text-white shadow-sm ring-2 ring-white">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-display font-black text-slate-900">Caja Cerrada</h2>
                <p className="text-xs text-muted-foreground">El cuadre ha sido registrado correctamente.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between text-xs mb-1 text-slate-500 uppercase font-bold tracking-wider">
                  <span>Efectivo Contado:</span>
                  <span className="text-slate-900 font-bold">{formatRD(contadoEf)}</span>
                </div>
                <div className="flex justify-between text-base font-black border-t border-slate-200 pt-2 mt-1">
                  <span>Total Contado:</span>
                  <span className="text-primary">
                    {formatRD(contadoEf + contadoTar + contadoTrans)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button 
                  onClick={handlePrint} 
                  disabled={loadingOrders}
                  className="bg-gradient-primary text-white h-11 text-base font-bold gap-2 shadow-lg shadow-primary/20"
                >
                  <Printer className="h-4 w-4" /> {loadingOrders ? "Preparando..." : "Imprimir Cierre"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-muted-foreground text-xs">
                  Listo, volver a caja
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function HistoricoCierresDialog({ open, onOpenChange, tenant, empleadoId }: { 
  open: boolean; onOpenChange: (o: boolean) => void; 
  tenant: Tenant;
  empleadoId?: string;
}) {
  const [empId, setEmpId] = useState(empleadoId || "all");
  const [desde, setDesde] = useState(new Date().toISOString().split('T')[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
  const [cierres, setCierres] = useState<Caja[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    if (open) {
      getEmpleados(tenant.id).then(setEmpleados);
      if (empleadoId) setEmpId(empleadoId);
      handleSearch();
    }
  }, [open, tenant.id, empleadoId]);

  async function handleSearch() {
    setLoading(true);
    const data = await getHistoricoCierres({ tenant_id: tenant.id, empleado_id: empId, desde, hasta });
    setCierres(data);
    setLoading(false);
  }

  const selectedEmpleado = empleados.find(e => e.id === empId);

  if (showPrint) {
    return (
      <ReporteCierrePrint 
        cierres={cierres} 
        tenant={tenant} 
        empleadoName={selectedEmpleado ? `${selectedEmpleado.nombre} ${selectedEmpleado.apellido}` : "Todos los empleados"}
        rango={`${desde} al ${hasta}`}
        onBack={() => setShowPrint(false)}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-display">Historial de Cierres</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-accent/5 p-4 rounded-2xl border border-border/50 mb-6">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Empleado / Cajero</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger className="bg-white border-border/60">
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los empleados</SelectItem>
                {empleados.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre} {e.apellido}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Desde</Label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="bg-white border-border/60" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Hasta</Label>
            <div className="flex gap-2">
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="bg-white border-border/60" />
              <Button onClick={handleSearch} size="icon" className="shrink-0"><Search className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground animate-pulse">Cargando histórico...</div>
          ) : cierres.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl">
              <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No se encontraron cierres para estos filtros.</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-accent/5 border-b border-border text-xs uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Apertura / Cierre</th>
                    <th className="px-4 py-3 text-left">Empleado</th>
                    <th className="px-4 py-3 text-right">Efectivo</th>
                    <th className="px-4 py-3 text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cierres.map(c => {
                    const emp = empleados.find(e => e.id === c.empleado_id);
                    return (
                      <tr key={c.id} className="hover:bg-accent/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">{formatDateTimeRD(c.abierta_en)}</div>
                          <div className="text-[10px] text-muted-foreground">{c.cerrada_en ? formatDateTimeRD(c.cerrada_en) : "No cerrado"}</div>
                        </td>
                        <td className="px-4 py-3 font-medium">{emp ? `${emp.nombre}` : "Desconocido"}</td>
                        <td className="px-4 py-3 text-right font-bold text-primary">{formatRD(c.monto_contado_efectivo || 0)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${(c.diferencia || 0) < 0 ? "text-destructive" : (c.diferencia || 0) > 0 ? "text-success" : "text-muted-foreground"}`}>
                          {formatRD(c.diferencia || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button 
            onClick={() => setShowPrint(true)} 
            disabled={cierres.length === 0}
            className="bg-gradient-primary text-white gap-2"
          >
            <Printer className="h-4 w-4" /> Generar Reporte Imprimible
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReporteCierrePrint({ cierres, tenant, empleadoName, rango, onBack }: { 
  cierres: Caja[], 
  tenant: Tenant, 
  empleadoName: string, 
  rango: string,
  onBack: () => void 
}) {
  const totalEfectivo = cierres.reduce((s, c) => s + (c.monto_contado_efectivo || 0), 0);
  const totalDiferencia = cierres.reduce((s, c) => s + (c.diferencia || 0), 0);

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target">
      <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none print:m-0">
        <div className="flex justify-between items-start border-b-2 border-primary/20 pb-6 mb-8 print:hidden relative z-[100000]">
          <Button variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBack(); }} className="gap-2 cursor-pointer">Volver a filtros</Button>
          <Button onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.print(); }} className="bg-primary text-white gap-2 cursor-pointer">
            <Printer className="h-4 w-4" /> Imprimir ahora
          </Button>
        </div>

        <div className="print-area">
          <div className="text-center mb-10">
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.nombre} className="h-16 mx-auto mb-4 object-contain" />
            ) : (
              <h1 className="text-4xl font-display font-black text-primary uppercase tracking-tighter mb-1">{tenant.nombre}</h1>
            )}
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.3em]">Reporte Histórico de Cierres de Caja</p>
            <div className="mt-6 flex justify-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-500">
              <div className="border-x border-slate-200 px-6">Empleado: <span className="text-foreground">{empleadoName}</span></div>
              <div className="border-x border-slate-200 px-6">Periodo: <span className="text-foreground">{rango}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-white">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Efectivo Recaudado</div>
              <div className="text-3xl font-display font-black text-primary">{formatRD(totalEfectivo)}</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-white">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Balance de Diferencias</div>
              <div className={`text-3xl font-display font-black ${totalDiferencia < 0 ? "text-destructive" : "text-success"}`}>
                {formatRD(totalDiferencia)}
              </div>
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="py-4 px-2">Fecha / Hora</th>
                <th className="py-4 px-2">Estado</th>
                <th className="py-4 px-2 text-right">Monto Inicial</th>
                <th className="py-4 px-2 text-right">Efectivo</th>
                <th className="py-4 px-2 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {cierres.map((c, i) => (
                <tr key={c.id} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-slate-50/30 print:bg-white" : ""}`}>
                  <td className="py-4 px-2">
                    <div className="font-bold">{formatDateTimeRD(c.abierta_en)}</div>
                    <div className="text-[10px] text-slate-400">ID: {c.id}</div>
                  </td>
                  <td className="py-4 px-2">
                    <Badge variant="outline" className="text-[9px] font-bold uppercase">{c.estado}</Badge>
                  </td>
                  <td className="py-4 px-2 text-right font-medium text-slate-500">{formatRD(c.monto_inicial)}</td>
                  <td className="py-4 px-2 text-right font-bold text-slate-900">{formatRD(c.monto_contado_efectivo || 0)}</td>
                  <td className={`py-4 px-2 text-right font-bold ${ (c.diferencia || 0) < 0 ? "text-destructive" : "text-success"}`}>
                    {formatRD(c.diferencia || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-20 grid grid-cols-2 gap-20 px-10">
            <div className="text-center">
              <div className="border-t border-slate-300 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Firma Administrador</div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-300 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Sello de Sucursal</div>
            </div>
          </div>
          
          <div className="mt-10 text-center text-[10px] text-slate-400 italic">
            Documento generado por Klynn POS - {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: portrait; margin: 10mm; }
          html, body { overflow: visible !important; height: auto !important; background: white !important; }
          /* OCULTAR TODO EL APP */
          body > *:not(.atomic-print-target) { display: none !important; }
          /* MOSTRAR SOLO EL TARGET */
          .atomic-print-target { 
            display: block !important; 
            visibility: visible !important; 
            position: static !important; 
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-area { visibility: visible !important; display: block !important; }
          .no-print { display: none !important; }
        }
      `}} />
    </div>,
    document.body
  );
}

function HistoricoCuadreDialog({ open, onOpenChange, tenant, empleadoId }: { 
  open: boolean; 
  onOpenChange: (o: boolean) => void; 
  tenant: Tenant;
  empleadoId?: string;
}) {
  const [empId, setEmpId] = useState(empleadoId || "all");
  const [desde, setDesde] = useState(new Date().toISOString().split('T')[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
  const [filtrarFechas, setFiltrarFechas] = useState(false);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  const formato = tenant.config?.formato_ticket || "80mm";

  useEffect(() => {
    if (open) {
      getEmpleados(tenant.id).then(setEmpleados);
      if (empleadoId) setEmpId(empleadoId);
      handleSearch();
    }
  }, [open, tenant.id, empleadoId]);

  async function handleSearch() {
    setLoading(true);
    const filters = { 
      tenant_id: tenant.id, 
      empleado_id: empId,
      desde: filtrarFechas ? desde : new Date().toISOString().split('T')[0],
      hasta: filtrarFechas ? hasta : new Date().toISOString().split('T')[0]
    };
    const data = await getOrdenesByPeriod(filters);
    setOrdenes(data);
    setLoading(false);
  }

  // Si cambia el toggle de filtrarFechas, refrescamos búsqueda
  useEffect(() => {
    if (open) handleSearch();
  }, [filtrarFechas, empId]);

  const selectedEmpleado = empleados.find(e => e.id === empId);

  if (showPrint) {
    return (
      <ReporteCuadreThermal 
        ordenes={ordenes} 
        tenant={tenant} 
        empleadoName={selectedEmpleado ? `${selectedEmpleado.nombre} ${selectedEmpleado.apellido || ""}` : "Todos los empleados"}
        rango={`${desde} al ${hasta}`}
        formato={formato}
        mostrarRango={filtrarFechas}
        onBack={() => setShowPrint(false)}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="bg-accent/10 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-accent-foreground" />
            </div>
            <DialogTitle className="text-2xl font-display">Imprimir Cuadre POS</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-accent/5 p-4 rounded-2xl border border-border/50 mb-6 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Empleado / Cajero</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger className="bg-white border-border/60">
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los empleados</SelectItem>
                {empleados.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre} {e.apellido}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-2">
              <Switch checked={filtrarFechas} onCheckedChange={setFiltrarFechas} id="f-fechas" />
              <Label htmlFor="f-fechas" className="text-xs font-bold uppercase cursor-pointer">Filtrar por fechas</Label>
            </div>
            <div className="p-2 bg-white rounded-lg border border-border/60 text-center text-xs">
              <span className="text-muted-foreground uppercase font-bold">Formato:</span> <span className="font-black text-primary">{formato}</span>
            </div>
          </div>

          {filtrarFechas ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Desde</Label>
                <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="bg-white border-border/60" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Hasta</Label>
                <div className="flex gap-2">
                  <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="bg-white border-border/60" />
                  <Button onClick={handleSearch} size="icon" className="shrink-0"><Search className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-2 p-3 bg-primary/5 rounded-xl border border-primary/10 text-center">
              <p className="text-xs font-medium text-primary">Mostrando órdenes de hoy ({new Date().toLocaleDateString()})</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground animate-pulse">Cargando órdenes...</div>
          ) : ordenes.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl">
              <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No se encontraron órdenes para este periodo.</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-accent/5 border-b border-border text-xs uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Orden</th>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ordenes.map(o => (
                    <tr key={o.id} className="hover:bg-accent/5 transition-colors">
                      <td className="px-4 py-3 font-bold">#{o.numero}</td>
                      <td className="px-4 py-3">{formatDateTimeRD(o.creado_en)}</td>
                      <td className="px-4 py-3 text-right font-bold text-primary">{formatRD(o.total)}</td>
                      <td className="px-4 py-3 text-right text-xs uppercase font-medium">{o.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button 
            onClick={() => setShowPrint(true)} 
            disabled={ordenes.length === 0}
            className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 gap-2"
          >
            <Printer className="h-4 w-4" /> Generar Cuadre Térmico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReporteCuadreThermal({ ordenes, tenant, empleadoName, rango, formato, mostrarRango, onBack }: { 
  ordenes: Orden[], 
  tenant: Tenant, 
  empleadoName: string, 
  rango: string,
  formato: "57mm" | "80mm",
  mostrarRango?: boolean,
  onBack: () => void 
}) {
  const total = ordenes.reduce((s, o) => s + o.total, 0);
  const cash = ordenes.filter(o => o.metodo_pago === 'EFECTIVO').reduce((s, o) => s + o.total, 0);
  const card = ordenes.filter(o => o.metodo_pago === 'TARJETA').reduce((s, o) => s + o.total, 0);
  const transfer = ordenes.filter(o => o.metodo_pago === 'TRANSFERENCIA').reduce((s, o) => s + o.total, 0);

  const w = formato === "57mm" ? "w-[58mm]" : "w-[80mm]";
  const cols = formato === "57mm" ? "max-w-[32ch]" : "max-w-[44ch]";

  return createPortal(
    <div className="fixed inset-0 bg-white z-[99999] overflow-y-auto pointer-events-auto atomic-print-target">
      <div className="max-w-md mx-auto p-8 print:p-0 print:max-w-none print:m-0">
        <div className="flex justify-between items-start border-b-2 border-primary/20 pb-4 mb-8 print:hidden relative z-[100000]">
          <Button variant="outline" onClick={(e) => { e.preventDefault(); onBack(); }} className="cursor-pointer">Cerrar</Button>
          <Button onClick={(e) => { e.preventDefault(); window.print(); }} className="bg-primary text-white gap-2 cursor-pointer">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>

        <div className={`print-area thermal-ticket mx-auto ${w} ${cols} bg-white p-4 font-mono text-[11px] leading-snug text-black border border-dashed border-black/10 print:border-none`}>
          <div className="text-center space-y-0.5">
            {tenant.logo_url ? (
              <div className="flex justify-center mb-1">
                <img src={tenant.logo_url} alt="Logo" className="h-16 w-auto max-w-[150px] object-contain filter grayscale" />
              </div>
            ) : (
              <div className="text-base font-bold uppercase leading-tight">{tenant.nombre}</div>
            )}
            <div className="font-bold">CUADRE DE CAJA POS</div>
            {mostrarRango && <div className="text-[9px] uppercase">{rango}</div>}
          </div>
          <div className="my-2 border-t border-dashed border-black" />
          
          <div className="space-y-1">
            <div className="flex justify-between"><span>Empleado:</span> <span>{empleadoName}</span></div>
            <div className="flex justify-between"><span>Fecha de impresión:</span> <span>{new Date().toLocaleString()}</span></div>
          </div>
          <div className="my-2 border-t border-dashed border-black" />

          <div className="font-bold text-center mb-2 underline">RESUMEN DE VENTAS</div>
          <div className="space-y-1">
            <div className="flex justify-between"><span>Efectivo:</span> <span>{formatRD(cash)}</span></div>
            <div className="flex justify-between"><span>Tarjeta:</span> <span>{formatRD(card)}</span></div>
            <div className="flex justify-between"><span>Transferencia:</span> <span>{formatRD(transfer)}</span></div>
            <div className="flex justify-between font-bold text-[13px] mt-1 pt-1 border-t border-black/10">
              <span>TOTAL VENTAS:</span> <span>{formatRD(total)}</span>
            </div>
          </div>
          
          <div className="my-2 border-t border-dashed border-black" />
          <div className="font-bold text-center mb-2 underline">DETALLE DE ÓRDENES</div>
          <div className="space-y-1">
             <div className="flex justify-between text-[10px] font-bold border-b border-black/5 pb-1">
               <span># ORDEN</span>
               <span>TOTAL</span>
             </div>
             {ordenes.map(o => (
                <div key={o.id} className="flex justify-between">
                  <span>{o.numero} ({o.metodo_pago?.substring(0,3)})</span>
                  <span>{formatRD(o.total)}</span>
                </div>
             ))}
          </div>

          <div className="my-4 border-t border-dashed border-black" />
          <div className="mt-8 text-center">
            <div className="border-t border-black w-3/4 mx-auto pt-1 mb-10">Firma Cajero</div>
            <div className="text-[9px] italic">Klynn POS System</div>
          </div>
        </div>
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
            line-height: ${tenant.config?.formato_ticket === "57mm" ? "1.2" : "1.3"} !important;
            box-sizing: border-box;
          }

          .thermal-ticket { border: none !important; padding: 0 !important; width: 100% !important; }
          
          /* Evitar cortes */
          .atomic-print-target * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            visibility: visible !important;
          }

          .no-print { display: none !important; }
        }
      `}} />
    </div>,
    document.body
  );
}
