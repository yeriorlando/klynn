import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  saveTenant, DEFAULT_CONFIG, formatPhoneRD, PROVINCIAS_RD, NCF_TIPOS,
  formatAmountInput, parseAmount, getPlans, updateTenantPlan, getGlobalConfig, formatRD,
  type Tenant, type TenantConfig, type WhatsAppConfig, type PlanId,
} from "@/lib/storage";
import { notificarWhatsApp } from "@/lib/whatsapp";
import { toast } from "sonner";
import { 
  MessageCircle, Send, Loader2, Save, Trash2, Image as ImageIcon, Upload,
  User, Palette, FileText, Banknote, CreditCard
} from "lucide-react";

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
  const { tenant: initialTenant } = useRequireAuth();
  const [tenant, setTenant] = useState<Tenant | null>(initialTenant || null);
  const [activeTab, setActiveTab] = useState("perfil");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  if (!tenant) return null;
  const cfg: TenantConfig = tenant.config || DEFAULT_CONFIG;
  const plan = getPlans().find(p => p.id === tenant.plan_id);
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
      toast.error("Error al guardar cambios");
    }
  }
  async function saveCfg(c: Partial<TenantConfig>) {
    try {
      const next: Tenant = { ...tenant!, config: { ...cfg, ...c } } as Tenant;
      await saveTenant(next);
      setTenant(next);
      toast.success("Guardado");
    } catch (err: any) {
      toast.error("Error al guardar configuración");
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
            { id: 'plan', label: 'Plan', icon: CreditCard }
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
                  <Field label="RNC"><Input className={FIELD} placeholder="Ej: 131-12345-6" value={tenant.rnc || ""} onChange={(e) => setTenant({ ...tenant, rnc: e.target.value })} /></Field>
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
                      <img src={tenant.logo_url} alt="Logo" className="h-32 w-32 rounded-xl object-contain bg-white p-4 shadow-sm border" />
                      <button onClick={() => setTenant({ ...tenant, logo_url: undefined })} 
                        className="absolute -right-2 -top-2 rounded-full bg-destructive p-1.5 text-white opacity-0 transition group-hover:opacity-100 shadow-lg">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-accent/50 text-muted-foreground border-2 border-dashed border-border/60">
                      <ImageIcon className="h-10 w-10 opacity-20" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="font-bold text-sm">Logotipo de la empresa</div>
                    <p className="text-xs text-muted-foreground max-w-[200px]">Se mostrará en la factura (ticket) y en el dashboard.</p>
                  </div>
                </div>
                <input type="file" accept="image/*" className="hidden" id="logo-upload" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setTenant({ ...tenant, logo_url: reader.result as string });
                    reader.readAsDataURL(file);
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
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Formato impresora">
                <Select value={cfg.formato_ticket} onValueChange={(v) => saveCfg({ formato_ticket: v as "57mm" | "80mm" })}>
                  <SelectTrigger className={FIELD}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="57mm">57mm</SelectItem><SelectItem value="80mm">80mm</SelectItem></SelectContent>
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
            wa={tenant.whatsapp || { active: false, config: {} }} 
            saveWA={(w) => save({ ...tenant, whatsapp: { ...tenant.whatsapp, ...w } })} 
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
                variant={billingPeriod === "monthly" ? "secondary" : "ghost"} 
                size="sm" 
                className="rounded-lg font-bold text-xs px-4 h-8"
                onClick={() => setBillingPeriod("monthly")}
              >
                Mensual
              </Button>
              <Button 
                variant={billingPeriod === "yearly" ? "secondary" : "ghost"} 
                size="sm" 
                className="rounded-lg font-bold text-xs px-4 h-8"
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
              {getPlans().map(p => {
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
                      <div className="text-xs flex items-center gap-2">✅ {p.limite_empleados} empleados</div>
                      <div className="text-xs flex items-center gap-2">✅ {p.limite_ordenes_mes ?? "∞"} órdenes/mes</div>
                      {Object.entries(p.modulos).map(([k, v]) => (
                        <div key={k} className={`text-xs flex items-center gap-2 ${v ? "text-foreground" : "text-muted-foreground opacity-50"}`}>
                          {v ? "✅" : "❌"} {k.replace(/_/g, " ")}
                        </div>
                      ))}
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          className="mt-auto h-10 rounded-xl font-bold" 
                          variant={isCurrent ? "outline" : "default"}
                          disabled={isCurrent}
                        >
                          {isCurrent ? "Tu plan" : "Cambiar plan"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl border-none shadow-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Confirmar cambio de plan?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Estás a punto de cambiar al plan <strong>{p.nombre}</strong>. 
                            Los nuevos límites y funciones se aplicarán inmediatamente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            className="rounded-xl bg-primary text-white"
                            onClick={async () => {
                              try {
                                await updateTenantPlan(tenant.id, p.id);
                                toast.success("Plan actualizado correctamente");
                                setTimeout(() => window.location.reload(), 1000);
                              } catch (err: any) {
                                toast.error("Error al actualizar plan");
                              }
                            }}
                          >
                            Confirmar cambio
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </Card>
                )
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WhatsAppTab({ tenant, wa, saveWA, enabled }: { 
  tenant: Tenant; wa: WhatsAppConfig; saveWA: (w: Partial<WhatsAppConfig>) => void; enabled: boolean;
}) {
  const [draft, setDraft] = useState<WhatsAppConfig>(() => ({
    ...DEFAULT_CONFIG.whatsapp,
    ...wa,
    plantilla_creada: wa.plantilla_creada || DEFAULT_CONFIG.whatsapp.plantilla_creada,
    plantilla_lista: wa.plantilla_lista || DEFAULT_CONFIG.whatsapp.plantilla_lista,
    plantilla_entregada: wa.plantilla_entregada || DEFAULT_CONFIG.whatsapp.plantilla_entregada,
  }));
  const [testPhone, setTestPhone] = useState(tenant.telefono || "");
  const [sending, setSending] = useState(false);

  async function probar() {
    setSending(true);
    saveWA(draft);
    const ordenDemo = {
      id: "demo", tenant_id: tenant.id, numero: "LX-DEMO-0001", cliente_id: "demo",
      empleado_id: "demo", servicios: [], items: [], subtotal: 500, itbis: 90, descuento: 0,
      total: 590, pagado: 590, saldo: 0, metodo_pago: "EFECTIVO", estado: "RECIBIDA",
      fecha_entrega: new Date(Date.now() + 86400000).toISOString(), es_urgente: false,
      creado_en: new Date().toISOString(),
    } as any;
    const cliDemo = { id: "demo", tenant_id: tenant.id, nombre: "Cliente Prueba", telefono: testPhone, tipo: "REGULAR", limite_credito: 0, creado_en: "" } as any;
    const tenantDraft = { ...tenant, config: { ...(tenant.config || {}), whatsapp: draft } } as Tenant;
    const r = await notificarWhatsApp(tenantDraft, cliDemo, ordenDemo, "creada");
    setSending(false);
    if (r.ok) toast.success("Mensaje enviado ✓");
    else toast.error("Error: " + (r.reason || "desconocido"));
  }

  return (
    <Card className={CARD + " relative overflow-hidden"}>
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

      <div className={!enabled ? "opacity-40 pointer-events-none grayscale-[50%]" : ""}>
        <div className="mb-8 flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-xl">Notificaciones WhatsApp</h3>
            <p className="text-sm text-muted-foreground">
              Envía avisos automáticos a tus clientes desde tu propio número. Powered by{" "}
              <a className="text-primary underline" href="https://wapisender.com/docs" target="_blank" rel="noreferrer">WapiSender</a>.
            </p>
          </div>
          <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="API Key" span>
            <Input className={FIELD} type="password" placeholder="sk_live_•••" value={draft.api_key} onChange={(e) => setDraft({ ...draft, api_key: e.target.value })} />
          </Field>
          <Field label="Nombre de instancia">
            <Input className={FIELD} placeholder="mi-lavanderia" value={draft.instance} onChange={(e) => setDraft({ ...draft, instance: e.target.value })} />
          </Field>
          <Field label="Base URL (opcional)">
            <Input className={FIELD} placeholder="https://api.wapisender.com" value={draft.base_url || ""} onChange={(e) => setDraft({ ...draft, base_url: e.target.value })} />
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
          <Field label="Plantilla — Orden creada" hint="Variables: {cliente} {numero} {total} {entrega} {lavanderia}">
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
            <Input className={FIELD + " w-56 bg-background"} value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="809-000-0000" />
          </Field>
          <Button variant="outline" className="h-11 rounded-xl font-bold" disabled={sending || !draft.api_key || !draft.instance} onClick={probar}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Enviar prueba
          </Button>
          <div className="flex-1" />
          <Button className="mt-4 rounded-xl font-bold h-11 px-8" onClick={() => saveWA(draft)}>
            <Save className="mr-2 h-4 w-4" /> Guardar cambios
          </Button>
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
