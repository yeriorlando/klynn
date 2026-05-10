import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Search, UserPlus, Phone, Mail, MapPin, Trash2 } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { ExportAndPrintButtons } from "@/components/klynn/ExportAndPrintButtons";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  getClientes, saveCliente, deleteCliente, getOrdenes, formatRD, formatPhoneRD, uid,
  type Cliente,
} from "@/lib/storage";
import { toast } from "sonner";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/t/$slug/clientes")({ component: ClientesPage });

function ClientesPage() {
  const user = useRequireAuth();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Cliente | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);

  const tenant = user?.tenant;
  const tenantId = tenant?.id || '';

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [cList, oList] = await Promise.all([
        getClientes(tenantId),
        getOrdenes(tenantId)
      ]);
      setClientes(cList);
      setOrdenes(oList);
      setLoading(false);
    }
    load();
  }, [tenantId, refresh]);

  const filt = clientes.filter((c) => c.nombre.toLowerCase().includes(q.toLowerCase()) || c.telefono.includes(q));

  if (!user || user.tenant.id === '__loading__') return null;

  function deudaCliente(id: string) {
    return ordenes.filter((o) => o.cliente_id === id && o.estado !== "ANULADA").reduce((s, o) => s + o.saldo, 0);
  }
  function totalGastado(id: string) {
    return ordenes.filter((o) => o.cliente_id === id && o.estado !== "ANULADA").reduce((s, o) => s + o.total, 0);
  }

  return (
    <div>
      <PageHeader title="Clientes" description={`${clientes.length} clientes registrados`}>
        <ExportAndPrintButtons 
          filename="Clientes" 
          tenant={tenant}
          columns={["Nombre", "Teléfono", "Email", "Dirección", "Tipo", "Total Gastado", "Deuda Actual"]}
          data={filt.map(c => [
            `${c.nombre} ${c.apellido || ""}`,
            c.telefono,
            c.email || "—",
            c.direccion || "—",
            c.tipo,
            formatRD(totalGastado(c.id)),
            formatRD(deudaCliente(c.id))
          ])}
        />
        <Button onClick={() => setShowNew(true)} className="bg-gradient-primary text-white transition-all duration-200 active:scale-95"><UserPlus className="mr-1.5 h-4 w-4" /> Nuevo cliente</Button>
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o teléfono..." className="pl-10" />
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filt.map((c) => {
          const deuda = deudaCliente(c.id);
          const total = totalGastado(c.id);
          return (
            <Card key={c.id} className="cursor-pointer p-5 transition hover:shadow-elegant" onClick={() => setEdit(c)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg">{c.nombre} {c.apellido || ""}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {c.telefono}</div>
                  {c.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {c.email}</div>}
                  {c.direccion && <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {c.direccion}</div>}
                </div>
                {c.tipo === "Empresa" ? (
                  <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-600">Empresa</Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">Consumidor Final</Badge>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                <div><div className="text-muted-foreground">Total gastado</div><div className="font-display text-base">{formatRD(total)}</div></div>
                <div><div className="text-muted-foreground">Deuda</div><div className={`font-display text-base ${deuda > 0 ? "text-destructive" : ""}`}>{formatRD(deuda)}</div></div>
              </div>
            </Card>
          );
        })}
        {filt.length === 0 && <div className="col-span-full py-12 text-center text-muted-foreground">Sin clientes.</div>}
      </div>
 
      <ClienteDialog open={showNew || !!edit} onOpenChange={(o) => { if (!o) { setShowNew(false); setEdit(null); } }} cliente={edit} tenantId={tenant.id} onDone={() => { setRefresh((r) => r + 1); setEdit(null); setShowNew(false); }} />
    </div>
  );
}
 
function ClienteDialog({ open, onOpenChange, cliente, tenantId, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; cliente: Cliente | null; tenantId: string; onDone: () => void }) {
  const user = useRequireAuth();
  const empty = { nombre: "", apellido: "", telefono: "", email: "", direccion: "", cedula: "", notas: "", tipo: "Consumidor Final" as Cliente["tipo"], limite_credito: 0 };
  const [f, setF] = useState(cliente ? { ...empty, ...cliente } : empty);
  const [hasDelivery, setHasDelivery] = useState(!!cliente?.direccion);

  useEffect(() => {
    if (open) {
      const data = cliente ? { ...empty, ...cliente } : empty;
      setF(data);
      setHasDelivery(!!cliente?.direccion);
    }
  }, [cliente, open]);
 
  async function submit() {
    const isEmpresa = f.tipo === "Empresa";
    if (!f.nombre.trim() || (!isEmpresa && !f.apellido.trim()) || f.telefono.replace(/\D/g, "").length < 10) { 
      toast.error(isEmpresa ? "Nombre de empresa y teléfono válidos requeridos" : "Nombre, apellido y teléfono válidos requeridos"); 
      return; 
    }
    if (hasDelivery && !f.direccion?.trim()) {
      toast.error("La dirección es requerida para envío a domicilio");
      return;
    }
    try {
      const c: Cliente = {
        id: cliente?.id || uid("cli"), tenant_id: tenantId, nombre: f.nombre, apellido: f.apellido || undefined, telefono: f.telefono,
        email: f.email || undefined, direccion: hasDelivery ? f.direccion : undefined, cedula: f.cedula || undefined,
        notas: f.notas || undefined, tipo: f.tipo, limite_credito: f.limite_credito,
        creado_en: cliente?.creado_en || new Date().toISOString(),
      };
      await saveCliente(c); 
      toast.success(cliente ? "Actualizado ✨" : "Cliente creado ✅"); 
      onDone();
    } catch (err: any) {
      toast.error("Error al guardar cliente");
    }
  }
  async function remove() {
    if (cliente) { 
      try {
        await deleteCliente(cliente.id); 
        toast.success("Eliminado 🗑️"); 
        onDone(); 
      } catch (err) {
        toast.error("Error al eliminar");
      }
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{cliente ? "Editar cliente" : "Nuevo cliente"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Fila 1: Siempre Tipo y Telefono para aprovechar espacio */}
          <div>
            <Label>Tipo de Cliente</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as Cliente["tipo"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
                {user.tenant.config?.ncf_facturacion_activa && <SelectItem value="Empresa">Empresa</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Telefono/whatsapp</Label>
            <Input value={f.telefono} onChange={(e) => setF({ ...f, telefono: formatPhoneRD(e.target.value) })} placeholder="809-000-0000" />
          </div>

          {f.tipo === "Empresa" ? (
            <>
              {/* Flujo Empresa: Nombre (Solo) -> RNC + Email (Juntos) */}
              <div className="md:col-span-2 animate-in fade-in slide-in-from-left-1 duration-200">
                <Label>Nombre de la empresa</Label>
                <Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Inversiones Dominicana" />
              </div>
              {user.tenant.config?.ncf_facturacion_activa && (
                <div className="animate-in fade-in slide-in-from-left-1 duration-200">
                  <Label>RNC de la Empresa</Label>
                  <Input value={f.cedula} onChange={(e) => setF({ ...f, cedula: e.target.value })} placeholder="131-12345-6" />
                </div>
              )}
              <div>
                <Label>Email (Opcional)</Label>
                <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="cliente@correo.com" />
              </div>
            </>
          ) : (
            <>
              {/* Flujo Consumidor: Nombre + Apellido (Juntos) -> Email (Solo) */}
              <div className="animate-in fade-in slide-in-from-left-1 duration-200">
                <Label>Nombre</Label>
                <Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Juan" />
              </div>
              <div className="animate-in fade-in slide-in-from-left-1 duration-200">
                <Label>Apellido</Label>
                <Input value={f.apellido} onChange={(e) => setF({ ...f, apellido: e.target.value })} placeholder="Ej. Pérez" />
              </div>
              <div className="md:col-span-2">
                <Label>Email (Opcional)</Label>
                <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="cliente@correo.com" />
              </div>
            </>
          )}
          
          {/* Toggles de Preferencias */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3 md:col-span-2 bg-accent/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Envío a domicilio</Label>
              <div className="text-[11px] text-muted-foreground">¿Este cliente requiere delivery para sus órdenes?</div>
            </div>
            <Switch 
              checked={hasDelivery} 
              onCheckedChange={(checked) => {
                setHasDelivery(checked);
                if (!checked) setF({ ...f, direccion: "" });
              }} 
            />
          </div>

          {hasDelivery && (
            <div className="md:col-span-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <Label>Dirección de entrega</Label>
              <Input value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} placeholder="Calle, # Casa, Sector..." />
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-border p-3 md:col-span-2 bg-accent/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Habilitar crédito</Label>
              <div className="text-[11px] text-muted-foreground">Permite que este cliente deje órdenes por pagar.</div>
            </div>
            <Switch 
              checked={f.limite_credito > 0} 
              onCheckedChange={(checked) => setF({ ...f, limite_credito: checked ? 5000 : 0 })} 
            />
          </div>

          {f.limite_credito > 0 && (
            <div className="md:col-span-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <Label>Límite de crédito (RD$)</Label>
              <Input type="number" value={f.limite_credito} onChange={(e) => setF({ ...f, limite_credito: Number(e.target.value) || 0 })} />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          {cliente && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive mr-auto"><Trash2 className="mr-1.5 h-4 w-4" /> Eliminar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl border-none shadow-card">
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar a {cliente.nombre}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará el registro del cliente pero sus órdenes pasadas permanecerán en el sistema para fines contables.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={remove} className="bg-destructive text-white rounded-xl">Eliminar permanentemente</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-white">Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
