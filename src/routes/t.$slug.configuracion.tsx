import { createFileRoute, Link } from "@tanstack/react-router";
import { compressImage } from "@/lib/compressImage";
import { useState, useEffect } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  saveTenant, DEFAULT_CONFIG, formatPhoneRD, formatCedulaRD, PROVINCIAS_RD, NCF_TIPOS,
  formatAmountInput, parseAmount, getPlans, updateTenantPlan, getGlobalConfig, formatRD,
  getTenantPlan,
  type Tenant, type TenantConfig, type WhatsAppConfig, type PlanId, type Plan, type Gasto,
  type GlobalConfig, type BankDetails
} from "@/lib/storage";
import { notificarWhatsApp } from "@/lib/whatsapp";
import { toast } from "sonner";
import { 
  Building2, Shield, TrendingUp, Users, Trash2, ExternalLink, Plus, Pencil, 
  RefreshCw, Package, LogOut, MoreHorizontal, Key, Droplets as DropletsIcon,
  CreditCard, MessageCircle, Send, Loader2, Save, Image as ImageIcon, Upload,
  User, Palette, FileText, Banknote, Star, Sparkles, ArrowRight, Copy, Smartphone, CheckCircle2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/t/$slug/configuracion")({ component: ConfigPage });

const FIELD = "h-11 rounded-lg border-input bg-background text-base focus-visible:ring-1 focus-visible:ring-ring transition-all px-4";
const LABEL = "text-sm font-medium text-foreground";
const CARD = "border shadow-sm p-6 rounded-lg";

function Field({ label, children, hint, span }: { label: string; children: React.ReactNode; hint?: string; span?: boolean }) {
  return (
    <div className={`flex flex-col gap-2 ${span ? "md:col-span-2" : ""}`}>
      <Label className={LABEL}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ConfigPage() {
  const auth = useRequireAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState("perfil");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (auth?.tenant && auth.tenant.id !== '__loading__' && !tenant) {
      setTenant(auth.tenant);
    }
    getPlans().then(setPlans);
    getGlobalConfig().then(setGlobalConfig);

    // Detectar retorno de pago exitoso
    const params = new URLSearchParams(window.location.search);
    if (params.get('polar_success') === 'true') {
      setShowSuccess(true);
      // Limpiar el parámetro de la URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [auth, tenant]);

  if (!auth || auth.tenant.id === '__loading__' || !tenant) return null;

  const cfg: TenantConfig = tenant.config || DEFAULT_CONFIG;
  const plan = plans.find(p => p.id === tenant.plan_id);
  const hasFiscal = plan?.modulos.facturacion_fiscal;
  const hasWA = plan?.modulos.whatsapp;
  const wa: WhatsAppConfig = cfg.whatsapp || DEFAULT_CONFIG.whatsapp!;

  async function save(updates: Partial<Tenant>) {
    try {
      const next: Tenant = { ...tenant!, ...updates } as Tenant;
      await saveTenant(next);
      setTenant(next);
      toast.success("Guardado");
      setTimeout(() => window.location.reload(), 400);
    } catch (err: any) {
      console.error("Error saving tenant:", err);
      toast.error("Error al guardar: " + (err.message || "desconocido"));
    }
  }
  async function saveCfg(c: Partial<TenantConfig>) {
    try {
      const next: Tenant = { ...tenant!, config: { ...cfg, ...c } } as Tenant;
      await saveTenant(next);
      setTenant(next);
      toast.success("Guardado");
    } catch (err: any) {
      console.error("Error saving config:", err);
      toast.error("Error al guardar configuración: " + (err.message || "desconocido"));
    }
  }
  async function saveWA(w: Partial<WhatsAppConfig>) {
    await saveCfg({ whatsapp: { ...wa, ...w } });
  }

  return (
    <div>
      <PageHeader title="Configuración" description="Personaliza tu lavandería." />
      <Tabs defaultValue="perfil" onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto bg-accent/20 p-1.5 rounded-2xl gap-1.5 border-2 border-border/10">
          {[
            { id: 'perfil', label: 'Perfil', icon: User },
            { id: 'apariencia', label: 'Apariencia', icon: Palette },
            { id: 'factura', label: 'Factura', icon: FileText },
            { id: 'caja', label: 'Caja & ITBIS', icon: Banknote },
            { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
            { id: 'plan', label: 'Plan', icon: CreditCard },
          ].map(t => (
            <TabsTrigger 
              key={t.id}
              value={t.id}
              className="rounded-xl py-2 font-bold transition-all data-[state=active]:text-white data-[state=active]:shadow-none border border-transparent data-[state=inactive]:border-border/50 data-[state=inactive]:bg-background/50 flex items-center gap-2"
              style={{ 
                backgroundColor: activeTab === t.id ? tenant.color_primario : undefined
              }}
            >
              <t.icon className="h-4 w-4" />
              <span className="hidden md:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="perfil">
          <Card className={CARD}>
            <div className="space-y-6">
              {/* Fila 1: Datos principales */}
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Nombre comercial"><Input className={FIELD} placeholder="Ej: Lavandería Klynn Central" value={tenant.nombre} onChange={(e) => setTenant({ ...tenant, nombre: e.target.value })} /></Field>
                <Field label="Teléfono"><Input className={FIELD} placeholder="Ej: 809-000-0000" value={tenant.telefono} onChange={(e) => setTenant({ ...tenant, telefono: formatPhoneRD(e.target.value) })} /></Field>
                <Field label="Email"><Input className={FIELD} placeholder="Ej: admin@lavanderia.com" value={tenant.email} onChange={(e) => setTenant({ ...tenant, email: e.target.value })} /></Field>
              </div>

              {/* RNC condicional */}
              {cfg.ncf_facturacion_activa && (
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="RNC"><Input className={FIELD} placeholder="Ej: 402-..." value={tenant.rnc || ""} onChange={(e) => setTenant({ ...tenant, rnc: formatCedulaRD(e.target.value) })} /></Field>
                </div>
              )}

              {/* Fila 2: Ubicación */}
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Provincia">
                  <Select value={tenant.provincia || ""} onValueChange={(v) => setTenant({ ...tenant, provincia: v })}>
                    <SelectTrigger className={FIELD}><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                    <SelectContent>
                      {PROVINCIAS_RD.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Dirección"><Input className={FIELD} placeholder="Calle Principal #123, Edificio Los Laureles" value={tenant.direccion} onChange={(e) => setTenant({ ...tenant, direccion: e.target.value })} /></Field>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t flex justify-start">
              <Button onClick={() => save(tenant)}>
                <Save className="mr-2 h-4 w-4" /> Guardar cambios
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="apariencia" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Tarjeta 1: Logotipo */}
            <Card className={CARD + " flex flex-col items-center justify-center min-h-[340px] text-center"}>
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  {tenant.logo_url ? (
                    <div className="relative group">
                      <img src={tenant.logo_url} alt="Logo" className="h-32 w-32 rounded-full object-contain bg-white p-4 shadow-sm border" />
                      <button onClick={() => setTenant({ ...tenant, logo_url: undefined })} 
                        className="absolute -right-2 -top-2 rounded-full bg-destructive p-1.5 text-white opacity-0 transition group-hover:opacity-100 shadow-lg">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-accent/50 text-muted-foreground border-2 border-dashed border-border/60">
                      <ImageIcon className="h-10 w-10 opacity-20" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="font-bold text-sm">Logotipo de la empresa</div>
                    <p className="text-xs text-muted-foreground max-w-[200px]">Se mostrará en la factura (ticket) y en el dashboard.</p>
                  </div>
                </div>
                <input type="file" accept="image/*" className="hidden" id="logo-upload" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const compressed = await compressImage(file, 512, 512, 0.7);
                      setTenant({ ...tenant, logo_url: compressed });
                    } catch {
                      toast.error("Error al procesar la imagen");
                    }
                  }
                }} />
                <Button variant="outline" size="sm" onClick={() => document.getElementById("logo-upload")?.click()}>
                  <Upload className="mr-2 h-3.5 w-3.5" /> {tenant.logo_url ? "Cambiar imagen" : "Subir logotipo"}
                </Button>
              </div>
            </Card>

            {/* Tarjeta 2: Color Primario */}
            <Card className={CARD + " flex flex-col items-center justify-center min-h-[340px] text-center"}>
              <div className="w-full max-w-xs space-y-6">
                <div className="space-y-2">
                  <div className="font-bold text-sm">Color de identidad</div>
                  <p className="text-xs text-muted-foreground">Define el color principal de los botones y acentos del sistema.</p>
                </div>
                <Field label="Color primario" className="text-center">
                  <div className="flex justify-center gap-3">
                    <input type="color" value={tenant.color_primario} onChange={(e) => setTenant({ ...tenant, color_primario: e.target.value })} 
                      className="h-12 w-16 cursor-pointer rounded-lg border border-input bg-background p-1" />
                    <Input className="h-12 w-32 text-center font-mono font-bold text-lg" value={tenant.color_primario} onChange={(e) => setTenant({ ...tenant, color_primario: e.target.value })} />
                  </div>
                </Field>
                <div className="pt-4 flex justify-center">
                   <div className="h-12 w-12 rounded-full shadow-inner border-4 border-white" style={{ backgroundColor: tenant.color_primario }} />
                </div>
              </div>
            </Card>
          </div>

          <div className="flex justify-center pt-2">
            <Button onClick={() => save(tenant)}>
              <Save className="mr-2 h-4 w-4" /> Guardar cambios
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="factura">
          <Card className={CARD}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Formato impresora">
                <Select value={cfg.formato_ticket} onValueChange={(v: any) => saveCfg({ formato_ticket: v })}>
                  <SelectTrigger className="rounded-xl border-input">
                    <SelectValue placeholder="Seleccionar formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="57mm">57mm</SelectItem>
                    <SelectItem value="80mm">80mm</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Tiempo de entrega estándar">
                <Select value={String(cfg.tiempo_entrega_estandar || 24)} onValueChange={(v) => saveCfg({ tiempo_entrega_estandar: Number(v) })}>
                  <SelectTrigger className="rounded-xl border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">1 DÍA (24 HORAS)</SelectItem>
                    <SelectItem value="48">2 DÍAS (48 HORAS)</SelectItem>
                    <SelectItem value="72">3 DÍAS (72 HORAS)</SelectItem>
                    <SelectItem value="96">4 DÍAS (96 HORAS)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Tiempo de entrega URGENTE">
                <Select value={String(cfg.tiempo_entrega_urgente || 6)} onValueChange={(v) => saveCfg({ tiempo_entrega_urgente: Number(v) })}>
                  <SelectTrigger className="rounded-xl border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 HORAS</SelectItem>
                    <SelectItem value="6">6 HORAS</SelectItem>
                    <SelectItem value="12">12 HORAS</SelectItem>
                    <SelectItem value="24">1 DÍA (24 HORAS)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {cfg.ncf_facturacion_activa && (
                <>
                  <Field label="NCF serie (ej: B01 o B02)"><Input className={FIELD} value={cfg.ncf_secuencia} onChange={(e) => saveCfg({ ncf_secuencia: e.target.value.toUpperCase() })} /></Field>
                  <Field label="Próximo número NCF" hint={`Ejemplo: ${cfg.ncf_secuencia || "BXX"}${String(cfg.ncf_proximo || 1).padStart(8, "0")}`}>
                    <Input 
                      className={FIELD} 
                      type="number" 
                      value={cfg.ncf_proximo || 1} 
                      onChange={(e) => saveCfg({ ncf_proximo: Number(e.target.value) })} 
                    />
                  </Field>
                </>
              )}
              <Field label="Pie de página del ticket" span>
                <Textarea className="rounded-md border-input focus-visible:ring-1 focus-visible:ring-ring" value={cfg.ticket_pie} onChange={(e) => saveCfg({ ticket_pie: e.target.value })} rows={3} />
              </Field>
              {cfg.ncf_facturacion_activa && (
                <label className="flex items-center justify-between rounded-md border border-input p-3">
                  <span className="text-sm font-medium">Mostrar RNC en ticket</span>
                  <Switch checked={cfg.ticket_mostrar_rnc} onCheckedChange={(v) => saveCfg({ ticket_mostrar_rnc: v })} />
                </label>
              )}
              <label className="flex items-center justify-between rounded-md border border-input p-3">
                <span className="text-sm font-medium">Mostrar empleado</span>
                <Switch checked={cfg.ticket_mostrar_empleado} onCheckedChange={(v) => saveCfg({ ticket_mostrar_empleado: v })} />
              </label>
            </div>
            <Button className="mt-6" onClick={() => save(tenant)}>
              <Save className="mr-2 h-4 w-4" /> Guardar cambios
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="caja">
          <Card className={CARD}>
            <div className="grid gap-4 md:grid-cols-2">
              {cfg.ncf_facturacion_activa && (
                <>
                  <Field label="ITBIS %"><Input className={FIELD} type="number" value={cfg.itbis_porcentaje} onChange={(e) => saveCfg({ itbis_porcentaje: Number(e.target.value) })} /></Field>
                  <label className="flex items-center justify-between rounded-md border border-input p-3 md:col-span-1">
                    <span className="text-sm font-medium">Precios incluyen ITBIS</span>
                    <Switch checked={cfg.itbis_incluido} onCheckedChange={(v) => saveCfg({ itbis_incluido: v })} />
                  </label>
                </>
              )}
              <Field label="Recargo urgencia %"><Input className={FIELD} type="number" value={cfg.recargo_urgencia} onChange={(e) => saveCfg({ recargo_urgencia: Number(e.target.value) })} /></Field>
              <Field label="Umbral diferencia caja (RD$)"><Input className={FIELD} value={formatAmountInput(String(cfg.umbral_diferencia_caja))} onChange={(e) => saveCfg({ umbral_diferencia_caja: parseAmount(e.target.value) })} /></Field>
              <Field label="Máx caja chica (RD$)"><Input className={FIELD} value={formatAmountInput(String(cfg.monto_max_caja_chica))} onChange={(e) => saveCfg({ monto_max_caja_chica: parseAmount(e.target.value) })} /></Field>

              <div className="md:col-span-2">
                <label className={`mb-3 flex items-center justify-between rounded-md border p-4 transition-all ${
                  hasFiscal ? "border-primary bg-primary/5" : "border-muted bg-muted/20 opacity-80"
                }`}>
                  <div>
                    <div className={`text-sm font-bold ${hasFiscal ? "text-primary" : "text-muted-foreground"}`}>
                      Facturación Fiscal {!hasFiscal && <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">PLAN SUPERIOR</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">Activa ITBIS, RNC y comprobantes fiscales de la DGII.</div>
                  </div>
                  <Switch 
                    disabled={!hasFiscal}
                    checked={!!cfg.ncf_facturacion_activa} 
                    onCheckedChange={(v) => saveCfg({ ncf_facturacion_activa: v })} 
                  />
                </label>
                {cfg.ncf_facturacion_activa && (
                  <div>
                    <Label className={LABEL + " mb-2 block"}>Tipos de NCF habilitados</Label>
                    <div className="grid gap-2">
                      {NCF_TIPOS.map((t) => {
                        const tipos = cfg.ncf_tipos || [];
                        const checked = tipos.includes(t.codigo);
                        return (
                          <label key={t.codigo}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition ${
                              checked ? "border-primary bg-accent/40" : "border-border hover:border-primary/40"
                            }`}>
                            <input type="checkbox" checked={checked}
                              onChange={(e) => {
                                const set = new Set(tipos);
                                if (e.target.checked) set.add(t.codigo); else set.delete(t.codigo);
                                saveCfg({ ncf_tipos: Array.from(set) });
                              }}
                              className="h-5 w-5 accent-primary" />
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className="font-mono font-bold">{t.codigo}</span>
                                <span className="text-sm font-medium">{t.nombre}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">{t.descripcion}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Button className="mt-6" onClick={() => save(tenant)}>
              <Save className="mr-2 h-4 w-4" /> Guardar cambios
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppTab 
            tenant={tenant} 
            wa={cfg.whatsapp || DEFAULT_CONFIG.whatsapp!} 
            saveWA={(w) => saveCfg({ whatsapp: { ...wa, ...w } })} 
            enabled={!!hasWA}
          />
        </TabsContent>

        <TabsContent value="plan">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-display text-2xl">Planes de Suscripción</h3>
              <p className="text-sm text-muted-foreground">Elige el plan que mejor se adapte al crecimiento de tu lavandería.</p>
            </div>
            <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/50">
              <Button 
                variant={billingPeriod === "monthly" ? "default" : "ghost"} 
                size="sm" 
                className={`rounded-lg font-bold text-xs px-4 h-8 transition-all ${billingPeriod === "monthly" ? "text-white shadow-sm" : "text-muted-foreground"}`}
                style={{ backgroundColor: billingPeriod === "monthly" ? tenant.color_primario : undefined }}
                onClick={() => setBillingPeriod("monthly")}
              >
                Mensual
              </Button>
              <Button 
                variant={billingPeriod === "yearly" ? "default" : "ghost"} 
                size="sm" 
                className={`rounded-lg font-bold text-xs px-4 h-8 transition-all ${billingPeriod === "yearly" ? "text-white shadow-sm" : "text-muted-foreground"}`}
                style={{ backgroundColor: billingPeriod === "yearly" ? tenant.color_primario : undefined }}
                onClick={() => setBillingPeriod("yearly")}
              >
                Anual
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-4 items-start">
            <Card className="p-6 border-none shadow-card bg-surface-elevated flex flex-col items-center text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Plan actual</div>
              <div className="mb-4"><PlanBadge id={tenant.plan_id} /></div>
              <div className="text-sm">Estado: <Badge variant={tenant.estado === "ACTIVO" ? "success" : "outline"} className="ml-1">{tenant.estado === "TRIAL" ? "Prueba" : tenant.estado}</Badge></div>
              {tenant.estado === "TRIAL" && (
                <div className="mt-2 text-xs text-muted-foreground">Termina el <strong>{new Date(tenant.trial_hasta).toLocaleDateString("es-DO")}</strong></div>
              )}
            </Card>

            <div className="md:col-span-3 grid gap-4 md:grid-cols-3">
              {plans.map(p => {
                const isCurrent = p.id === tenant.plan_id;
                const monthlyTotal = p.precio_mensual * 12;
                const annualPrice = p.precio_anual || monthlyTotal;
                const savings = monthlyTotal > annualPrice ? Math.round((1 - annualPrice / monthlyTotal) * 100) : 0;
                
                const price = billingPeriod === "monthly" ? p.precio_mensual : annualPrice;
                const period = billingPeriod === "monthly" ? "/mes" : "/año";
                
                return (
                  <Card key={p.id} className={`p-6 border-none shadow-card flex flex-col relative overflow-hidden ${isCurrent ? "ring-2 ring-primary" : ""}`}>
                    {isCurrent && <div className="absolute top-0 right-0 bg-primary text-white text-[10px] px-3 py-1 rounded-bl-xl font-bold uppercase tracking-widest">Actual</div>}
                    <div className="font-display text-xl mb-1">{p.nombre}</div>
                    <div className="flex flex-col mb-4">
                      <div className="text-2xl font-display text-primary">
                        {formatRD(price)}
                        <span className="text-xs font-normal text-muted-foreground">{period}</span>
                      </div>
                      {billingPeriod === "yearly" && savings > 0 && (
                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">
                          Ahorras {savings}% vs mensual
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      <div className="text-xs flex items-center gap-2">✅ {p.limite_empleados} Empleados</div>
                      <div className="text-xs flex items-center gap-2">✅ {p.limite_ordenes_mes ?? "∞"} Órdenes/mes</div>
                      <div className="text-xs flex items-center gap-2 font-medium text-blue-600">✅ {(p.limite_whatsapp_mes || 0).toLocaleString()} Mensajes WhatsApp/mes</div>
                      {Object.entries(p.modulos).map(([k, v]) => (
                        <div key={k} className={`text-xs flex items-center gap-2 ${v ? "text-foreground" : "text-muted-foreground opacity-50"}`}>
                          {v ? "✅" : "❌"} {k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " ")}
                        </div>
                      ))}
                    </div>

                        <Button 
                          className="mt-auto h-10 rounded-xl font-bold" 
                          variant={isCurrent ? "outline" : "default"}
                          disabled={isCurrent}
                          onClick={() => { setSelectedPlan(p); setShowCheckout(true); }}
                        >
                          {isCurrent ? "Tu plan" : "Cambiar plan"}
                        </Button>
                  </Card>
                )
              })}
            </div>
          </div>

          <SubscriptionModal 
            open={showCheckout} 
            onOpenChange={setShowCheckout} 
            plan={selectedPlan} 
            period={billingPeriod}
            bank={globalConfig?.bankDetails}
            tenant={tenant}
            onSuccess={() => { setShowCheckout(false); setShowSuccess(true); }}
          />

          <SuccessModal 
            open={showSuccess} 
            onOpenChange={setShowSuccess} 
            planName={selectedPlan?.nombre || ""} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WhatsAppTab({ tenant, wa, saveWA, enabled }: { 
  tenant: Tenant; wa: WhatsAppConfig; saveWA: (w: Partial<WhatsAppConfig>) => void; enabled: boolean;
}) {
  const [draft, setDraft] = useState<WhatsAppConfig>(() => {
    const baseWa = { ...DEFAULT_CONFIG.whatsapp, ...wa };
    if (baseWa.base_url?.includes("wapisender")) {
      baseWa.base_url = "https://wasenderapi.com";
    }
    return {
      ...baseWa,
      plantilla_creada: wa.plantilla_creada || DEFAULT_CONFIG.whatsapp.plantilla_creada,
      plantilla_lista: wa.plantilla_lista || DEFAULT_CONFIG.whatsapp.plantilla_lista,
      plantilla_entregada: wa.plantilla_entregada || DEFAULT_CONFIG.whatsapp.plantilla_entregada,
    };
  });
  const [testPhone, setTestPhone] = useState(tenant.telefono || "");
  const [sending, setSending] = useState(false);

  async function probar() {
    setSending(true);
    saveWA(draft);
    const ordenDemo = {
      id: "demo", tenant_id: tenant.id, numero: "KL-202605-0003", cliente_id: "demo",
      empleado_id: "demo", servicios: [], 
      items: [
        { descripcion: "Body de bebé", cantidad: 1, precio_unitario: 70 },
        { descripcion: "Manta de bebé", cantidad: 1, precio_unitario: 140 },
        { descripcion: "Camisa manga corta", cantidad: 1, precio_unitario: 150 },
        { descripcion: "Camisa manga larga", cantidad: 1, precio_unitario: 180 }
      ], 
      subtotal: 540, itbis: 0, descuento: 0,
      total: 540, pagado: 540, saldo: 0, metodo_pago: "EFECTIVO", estado: "RECIBIDA",
      fecha_entrega: "11/5/2026",
      es_urgente: false,
      creado_en: new Date().toISOString(),
    } as any;
    const cliDemo = { 
      id: "demo", 
      tenant_id: tenant.id, 
      nombre: "Yeri", 
      telefono: testPhone, 
      direccion: "Los Arroyos Del Norte #51",
      tipo: "REGULAR", 
      limite_credito: 0, 
      creado_en: "" 
    } as any;
    const tenantDraft = { ...tenant, config: { ...(tenant.config || {}), whatsapp: draft } } as Tenant;
    const r = await notificarWhatsApp(tenantDraft, cliDemo, ordenDemo, "creada");
    setSending(false);
    if (r.ok) toast.success("Mensaje enviado ✓");
    else toast.error("Error: " + (r.reason || "desconocido"));
  }


  return (
    <Card className={CARD + " relative overflow-hidden"}>
      {/* Barra de progreso de uso */}
      <div className="px-6 py-4 bg-slate-50/80 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Uso Mensual de WhatsApp</span>
            <span className="text-xs font-bold text-primary">
              {tenant.whatsapp_sent_month || 0} / {(getTenantPlan(tenant).limite_whatsapp_mes || 0).toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                ((tenant.whatsapp_sent_month || 0) / getTenantPlan(tenant).limite_whatsapp_mes) > 0.9 ? 'bg-red-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(100, ((tenant.whatsapp_sent_month || 0) / getTenantPlan(tenant).limite_whatsapp_mes) * 100)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {((tenant.whatsapp_sent_month || 0) / getTenantPlan(tenant).limite_whatsapp_mes) > 0.8 && (
            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold animate-pulse">LÍMITE CERCA</span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-[10px] rounded-lg font-bold border-primary/20 hover:bg-primary/5"
            onClick={() => {
              const tab = document.querySelector('[data-value="plan"]') as HTMLElement;
              tab?.click();
            }}
          >
            MEJORAR PLAN
          </Button>
        </div>
      </div>

      <div className="p-6 pt-6">
      {!enabled && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-border text-center max-w-sm mx-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
              <MessageCircle className="h-8 w-8" />
            </div>
            <h4 className="font-display text-2xl mb-2">Módulo de WhatsApp</h4>
            <p className="text-sm text-muted-foreground mb-6">
              Envía avisos automáticos y fideliza a tus clientes. 
              Esta función está disponible solo en planes superiores.
            </p>
            <Button className="w-full rounded-xl font-bold h-11" onClick={() => {
              const tab = document.querySelector('[data-value="plan"]') as HTMLElement;
              tab?.click();
            }}>
              Ver planes disponibles
            </Button>
          </div>
        </div>
      )}
      
      {/* Contenedor p-6 original si es necesario, pero ya lo moví arriba */}

      <div className={!enabled ? "opacity-40 pointer-events-none grayscale-[50%]" : ""}>
        <div className="mb-8 flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-xl">Notificaciones WhatsApp</h3>
            <p className="text-sm text-muted-foreground">
              Envía avisos automáticos a tus clientes desde tu propio número. Powered by{" "}
              <a className="text-primary underline" href="https://wasenderapi.com/api-docs" target="_blank" rel="noreferrer">WASenderAPI</a>.
            </p>
          </div>
          <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="API Token (Personal Access Token)" span>
            <Input className={FIELD} type="password" placeholder="Tu token de wasenderapi.com" value={draft.api_key} onChange={(e) => setDraft({ ...draft, api_key: e.target.value })} />
          </Field>
          <Field label="Session ID / Instance (Opcional)" hint="Solo si usas múltiples sesiones.">
            <Input className={FIELD} placeholder="default" value={draft.instance} onChange={(e) => setDraft({ ...draft, instance: e.target.value })} />
          </Field>
          <Field label="Base URL (Servidor)">
            <Input className={FIELD} placeholder="https://wasenderapi.com" value={draft.base_url || ""} onChange={(e) => setDraft({ ...draft, base_url: e.target.value })} />
          </Field>
        </div>

        <div className="mt-8">
          <Label className={LABEL}>Eventos automáticos</Label>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {[
              { k: "notif_orden_creada", label: "Al crear orden" },
              { k: "notif_orden_lista", label: "Cuando esté lista" },
              { k: "notif_orden_entregada", label: "Al entregar" },
            ].map((it) => (
              <label key={it.k} className="flex items-center justify-between rounded-xl border border-input p-4 hover:bg-accent/30 transition-colors">
                <span className="text-sm font-medium">{it.label}</span>
                <Switch
                  checked={(draft as any)[it.k]}
                  onCheckedChange={(v) => setDraft({ ...draft, [it.k]: v } as WhatsAppConfig)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          <Field label="Plantilla — Orden creada" hint="Variables: {lavanderia} {lavanderia_tel} {lavanderia_dir} {numero} {fecha} {cliente} {cliente_tel} {cliente_dir} {detalle} {subtotal} {total} {metodo_pago} {pagado} {saldo} {entrega} {estado} {web_url}">
            <Textarea className="rounded-xl border-input focus-visible:ring-1 focus-visible:ring-ring" rows={2} value={draft.plantilla_creada} onChange={(e) => setDraft({ ...draft, plantilla_creada: e.target.value })} />
          </Field>
          <Field label="Plantilla — Orden lista">
            <Textarea className="rounded-xl border-input focus-visible:ring-1 focus-visible:ring-ring" rows={2} value={draft.plantilla_lista} onChange={(e) => setDraft({ ...draft, plantilla_lista: e.target.value })} />
          </Field>
          <Field label="Plantilla — Orden entregada">
            <Textarea className="rounded-xl border-input focus-visible:ring-1 focus-visible:ring-ring" rows={2} value={draft.plantilla_entregada} onChange={(e) => setDraft({ ...draft, plantilla_entregada: e.target.value })} />
          </Field>
        </div>

        <div className="mt-8 flex flex-wrap items-end gap-3 rounded-2xl bg-muted/30 p-6 border border-border/50">
          <Field label="Probar al número">
            <Input className={FIELD + " w-56 bg-background"} value={testPhone} onChange={(e) => setTestPhone(formatPhoneRD(e.target.value))} placeholder="829-000-0000" />
          </Field>
          <Button variant="outline" className="h-11 rounded-xl font-bold" disabled={sending || !draft.api_key} onClick={probar}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Enviar prueba
          </Button>
          <div className="flex-1" />
          <Button className="mt-4 rounded-xl font-bold h-11 px-8" onClick={() => saveWA(draft)}>
            <Save className="mr-2 h-4 w-4" /> Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  </Card>
);
}

function PlanBadge({ id }: { id: string }) {
  const configs: any = {
    basico: { label: "Básico", className: "bg-blue-50 text-blue-700 border-blue-200" },
    pro: { label: "Pro", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    enterprise: { label: "Enterprise", className: "bg-amber-50 text-amber-700 border-amber-200" },
  };
  const config = configs[id] || { label: id, className: "" };
  return (
    <span className={`px-3 py-0.5 rounded-full uppercase text-[10px] font-bold tracking-widest border ${config.className}`}>
      {config.label}
    </span>
  );
}

function SubscriptionModal({ open, onOpenChange, plan, period, bank, tenant, onSuccess }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plan: Plan | null;
  period: "monthly" | "yearly";
  bank?: BankDetails;
  tenant: Tenant;
  onSuccess: () => void;
}) {
  if (!plan) return null;

  const price = period === "monthly" ? plan.precio_mensual : (plan.precio_anual || plan.precio_mensual * 12 * 0.85);
  const polarUrl = period === "monthly" ? plan.polar_product_monthly_url : plan.polar_product_yearly_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-[1.5rem] border-none shadow-elegant p-0 overflow-hidden">
        <div className="bg-gradient-primary p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CreditCard className="h-16 w-16 rotate-12" />
          </div>
          <div className="relative">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-0.5">Pasarela de Pago Segura</div>
            <h2 className="text-2xl font-display leading-tight">Suscripción {plan.nombre}</h2>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold">{formatRD(price).replace("DOP", "RD$")}</span>
              <span className="text-xs opacity-70">/{period === "monthly" ? "mes" : "año"}</span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 bg-surface">
          <div className="grid grid-cols-1 gap-3">
            {/* OPCIÓN 1: TARJETA */}
            <button 
              onClick={() => {
                if (polarUrl) {
                  const checkoutUrl = new URL(polarUrl);
                  checkoutUrl.searchParams.set('customer_email', tenant.email);
                  window.open(checkoutUrl.toString(), "_blank");
                  toast.info("Esperando confirmación de pago...", {
                    description: "Una vez completado el pago en Polar, tu plan se activará automáticamente.",
                    duration: 6000
                  });
                } else {
                  toast.error("Enlace de pago no configurado para este plan.");
                }
              }}
              className="flex items-center gap-4 w-full p-4 rounded-2xl border-2 border-primary/10 bg-primary/5 hover:border-primary hover:bg-primary/10 transition-all text-left group relative overflow-hidden shadow-sm hover:shadow-md"
            >
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-base text-foreground mb-0.5">Pago con Tarjeta</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">Débito o Crédito vía Polar.sh</div>
              </div>
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                <ArrowRight className="h-3 w-3 text-primary" />
              </div>
            </button>

            {/* OPCIÓN 2: TRANSFERENCIA */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-4 w-full p-4 rounded-2xl border-2 border-border bg-surface hover:border-primary/50 transition-all text-left group shadow-sm hover:shadow-md">
                  <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-base text-foreground mb-0.5">Transferencia</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">Pago directo a cuenta local</div>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                    <ArrowRight className="h-3 w-3 text-primary" />
                  </div>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2rem] border-none shadow-elegant max-w-[420px] p-0 overflow-hidden">
                <div className="p-8">
                  <AlertDialogHeader className="mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <Banknote className="h-6 w-6 text-primary" />
                    </div>
                    <AlertDialogTitle className="text-2xl font-display">Datos Bancarios</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm leading-relaxed">
                      Realiza la transferencia y envíanos el comprobante por WhatsApp para activar tu plan de inmediato.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  {bank ? (
                    <div className="bg-accent/40 rounded-3xl p-6 space-y-5 border border-border/50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Building2 className="h-20 w-20" />
                      </div>
                      <div className="space-y-1 relative">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Institución Bancaria</div>
                        <div className="font-bold text-lg flex items-center justify-between">
                          {bank.banco}
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => { navigator.clipboard.writeText(bank.banco); toast.success("Copiado"); }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 relative">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Número de Cuenta</div>
                        <div className="font-mono text-2xl font-bold flex items-center justify-between text-primary tracking-tighter">
                          {bank.numero_cuenta}
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => { navigator.clipboard.writeText(bank.numero_cuenta); toast.success("Copiado"); }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6 relative">
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Tipo</div>
                          <div className="font-bold text-sm">{bank.tipo_cuenta}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">RNC / Cédula</div>
                          <div className="font-bold text-sm">{bank.rnc}</div>
                        </div>
                      </div>
                      <div className="space-y-1 border-t border-border/50 pt-4 relative">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Titular de la Cuenta</div>
                        <div className="font-bold text-sm uppercase tracking-wide">{bank.titular}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-accent/20 rounded-3xl border border-dashed border-border/50">
                      <p className="text-sm text-muted-foreground">Los datos bancarios no han sido configurados por el administrador.</p>
                    </div>
                  )}

                  <div className="grid gap-2 mt-6">
                    <Button 
                      className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold h-11 shadow-md shadow-[#25D366]/10 text-sm transition-transform active:scale-95"
                      onClick={() => {
                        const text = encodeURIComponent(`Hola Klynn, acabo de realizar la transferencia para el plan ${plan.nombre} (${tenant.nombre}). Aquí envío el comprobante.`);
                        window.open(`https://wa.me/18299416546?text=${text}`, "_blank");
                      }}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" /> ENVIAR COMPROBANTE
                    </Button>
                    <AlertDialogCancel className="w-full rounded-xl border-none bg-accent/50 h-10 font-bold text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">Cerrar</AlertDialogCancel>
                  </div>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <p className="text-center text-[10px] text-muted-foreground px-6 pb-6 leading-relaxed">
            Al suscribirte aceptas nuestros <Link to="/terminos" className="underline hover:text-primary">Términos de Servicio</Link> y <Link to="/privacidad" className="underline hover:text-primary">Políticas de Privacidad</Link>. 
            Los cargos se realizarán mensualmente de forma automática.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SuccessModal({ open, onOpenChange, planName }: { open: boolean; onOpenChange: (o: boolean) => void; planName: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] border-none shadow-elegant text-center p-0 overflow-hidden bg-surface">
        <div className="h-32 bg-gradient-to-br from-success/20 via-success/5 to-transparent relative">
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="h-20 w-20 rounded-[2rem] bg-white shadow-xl flex items-center justify-center rotate-12 relative -bottom-10 border border-success/10">
                <CheckCircle2 className="h-10 w-10 text-success" />
             </div>
          </div>
        </div>
        
        <div className="p-10 pt-16 flex flex-col items-center">
          <h2 className="text-3xl font-display mb-3 text-foreground">¡Suscripción Activada!</h2>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed max-w-[280px]">
            Tu lavandería ahora tiene acceso total al plan <strong className="text-primary font-bold">{planName}</strong>. 
            ¡Prepárate para llevar tu negocio al siguiente nivel!
          </p>
          
          <div className="w-full p-5 bg-accent/30 rounded-3xl mb-10 border border-border/50 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Nuevos beneficios</span>
            </div>
            <ul className="text-xs space-y-3 text-muted-foreground">
              <li className="flex items-center gap-3"><Star className="h-3 w-3 text-primary" /> Acceso ilimitado a reportes avanzados</li>
              <li className="flex items-center gap-3"><Star className="h-3 w-3 text-primary" /> Mayor capacidad de órdenes y empleados</li>
              <li className="flex items-center gap-3"><Star className="h-3 w-3 text-primary" /> Soporte VIP vía WhatsApp en minutos</li>
            </ul>
          </div>

          <Button 
            onClick={() => window.location.reload()} 
            className="w-full bg-gradient-primary text-white rounded-[1.5rem] h-16 font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
          >
            Comenzar Experiencia Premium
          </Button>
          
          <button 
            onClick={() => onOpenChange(false)}
            className="mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium underline underline-offset-4"
          >
            Cerrar esta ventana
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
