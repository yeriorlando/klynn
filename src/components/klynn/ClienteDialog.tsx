import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Phone, Mail, MapPin, Trash2, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { saveCliente, deleteCliente, formatPhoneRD, uid, type Cliente } from "@/lib/storage";
import { toast } from "sonner";

interface ClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: Cliente | null;
  tenant: any;
  onDone: (cliente?: Cliente) => void;
}

export function ClienteDialog({ open, onOpenChange, cliente, tenant, onDone }: ClienteDialogProps) {
  const queryClient = useQueryClient();
  const empty = { 
    nombre: "", 
    apellido: "", 
    telefono: "", 
    email: "", 
    direccion: "", 
    cedula: "", 
    notas: "", 
    tipo: "Consumidor Final" as Cliente["tipo"], 
    limite_credito: 0 
  };
  const [f, setF] = useState(cliente ? { ...empty, ...cliente } : empty);
  const [hasDelivery, setHasDelivery] = useState(!!cliente?.direccion);
  const [loadingRNC, setLoadingRNC] = useState(false);

  async function handleSearchRNC() {
    const rnc = f.cedula?.replace(/\D/g, "");
    if (!rnc || rnc.length < 9) {
      toast.error("RNC/Cédula inválido (min. 9 dígitos)");
      return;
    }
    setLoadingRNC(true);
    try {
      const targetUrl = `https://dgii-rnc.pronesoft.com/get/${rnc}`;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data?.name) {
        setF(prev => ({ ...prev, nombre: data.name, cedula: data.rnc || rnc }));
        toast.success("Datos obtenidos ✅");
      } else {
        toast.error("No se encontró el contribuyente");
      }
    } catch (e) {
      toast.error("Error al conectar con el servicio DGII");
    } finally {
      setLoadingRNC(false);
    }
  }

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
        id: cliente?.id || uid("cli"), 
        tenant_id: tenant.id, 
        nombre: f.nombre, 
        apellido: f.apellido || undefined, 
        telefono: f.telefono,
        email: f.email || undefined, 
        direccion: hasDelivery ? f.direccion : undefined, 
        cedula: f.cedula || undefined,
        notas: f.notas || undefined, 
        tipo: f.tipo, 
        limite_credito: f.limite_credito,
        creado_en: cliente?.creado_en || new Date().toISOString(),
      };
      await saveCliente(c); 
      queryClient.invalidateQueries({ queryKey: ['clientes', tenant.id] });
      toast.success(cliente ? "Actualizado ✨" : "Cliente creado ✅"); 
      onDone(c);
    } catch (err: any) {
      toast.error("Error al guardar cliente");
    }
  }

  async function remove() {
    if (cliente) { 
      try {
        await deleteCliente(cliente.id); 
        queryClient.invalidateQueries({ queryKey: ['clientes', tenant.id] });
        toast.success("Eliminado 🗑️"); 
        onDone(); 
      } catch (err: any) {
        if (err?.code === '23503') {
          toast.error("No se puede eliminar: el cliente tiene órdenes registradas.");
        } else {
          toast.error(`Error al eliminar: ${err?.message || "Desconocido"}`);
        }
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{cliente ? "Editar cliente" : "Nuevo cliente"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2 py-2">
          <div>
            <Label>Tipo de Cliente</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as Cliente["tipo"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
                {tenant.config?.ncf_facturacion_activa && <SelectItem value="Empresa">Empresa</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Telefono / WhatsApp</Label>
            <Input value={f.telefono} onChange={(e) => setF({ ...f, telefono: formatPhoneRD(e.target.value) })} placeholder="809-000-0000" />
          </div>

          {f.tipo === "Empresa" ? (
            <>
              <div className="md:col-span-2 animate-in fade-in slide-in-from-left-1 duration-200">
                <Label>Nombre de la empresa</Label>
                <Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Inversiones Dominicana" />
              </div>
              {tenant.config?.ncf_facturacion_activa && (
                <div className="animate-in fade-in slide-in-from-left-1 duration-200">
                  <Label>RNC de la Empresa</Label>
                  <div className="relative">
                    <Input 
                      value={f.cedula} 
                      onChange={(e) => setF({ ...f, cedula: e.target.value })} 
                      placeholder="131-12345-6"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-primary hover:bg-primary/10"
                      onClick={handleSearchRNC}
                      disabled={loadingRNC}
                    >
                      {loadingRNC ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              <div className={tenant.config?.ncf_facturacion_activa ? "" : "md:col-span-2"}>
                <Label>Email (Opcional)</Label>
                <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="cliente@correo.com" />
              </div>
            </>
          ) : (
            <>
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
          
          <div className="flex items-center justify-between rounded-lg border border-border p-3 md:col-span-2 bg-accent/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold">Envío a domicilio</Label>
              <div className="text-[11px] text-muted-foreground">¿Este cliente requiere delivery?</div>
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
              <Label className="text-sm font-bold">Habilitar crédito</Label>
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
                    Esta acción no se puede deshacer. Se eliminará el registro del cliente pero sus órdenes pasadas permanecerán en el sistema.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={remove} className="bg-destructive text-white rounded-xl border-none">Eliminar permanentemente</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" className="rounded-xl h-9 text-xs" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-white rounded-xl h-9 text-xs px-6">Guardar Cliente</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
