import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { UserPlus, Trash2, Shield } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getEmpleados, saveEmpleado, deleteEmpleado, getOrdenes, formatRD, uid,
  PERMISOS_SISTEMA, getPermisosPorRol, can,
  type Empleado, type RolEmpleado, type Orden, type Caja
} from "@/lib/storage";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { checkPlanLimits } from "@/lib/storage";
import { PlanLimitModal } from "@/components/klynn/PlanLimitModal";
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

export const Route = createFileRoute("/t/$slug/personal")({ component: PersonalPage });

function PersonalPage() {
  const user = useRequireAuth();
  const [refresh, setRefresh] = useState(0);
  const [edit, setEdit] = useState<Empleado | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [emps, setEmps] = useState<Empleado[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [limits, setLimits] = useState<any>({ employeesReached: false, employeeLimit: 0 });
  const [loading, setLoading] = useState(true);

  const tenant = user?.tenant;
  const tenantId = tenant?.id || '';

  useEffect(() => {
    async function load() {
      if (!tenantId || tenantId === '__loading__') return;
      setLoading(true);
      const [eList, oList, lim] = await Promise.all([
        getEmpleados(tenantId),
        getOrdenes(tenantId),
        checkPlanLimits(tenantId)
      ]);
      setEmps(eList);
      setOrdenes(oList);
      setLimits(lim);
      setLoading(false);
    }
    load();
  }, [tenantId, refresh]);

  if (!user || user.tenant.id === '__loading__') return null;

  if (!can(user.empleado, "personal")) {
    return <NoAccess />;
  }



  function handleAdd() {
    if (limits.employeesReached) {
      setShowLimitModal(true);
    } else {
      setShowNew(true);
    }
  }

  const staffCount = emps.filter(e => e.rol !== "ADMIN").length;

  return (
    <div>
      <PageHeader title="Personal" description={`${staffCount} empleados (excluyendo administradores)`}>
        <Button onClick={handleAdd} className="bg-gradient-primary text-white"><UserPlus className="mr-1.5 h-4 w-4" /> Nuevo empleado</Button>
      </PageHeader>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {emps.map((e) => {
          const stats = ordenes.filter((o) => o.empleado_id === e.id && o.estado !== "ANULADA");
          const total = stats.reduce((s, o) => s + o.total, 0);
          return (
            <Card key={e.id} className="cursor-pointer p-5 hover:shadow-elegant" onClick={() => setEdit(e)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg">{e.nombre} {e.apellido || ""}</div>
                  <div className="text-xs text-muted-foreground">{e.email}</div>
                </div>
                <Badge variant={e.activo ? "default" : "outline"} className={e.activo ? "bg-success" : ""}>{e.rol}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                <div><div className="text-muted-foreground">Órdenes</div><div className="font-display text-base">{stats.length}</div></div>
                <div><div className="text-muted-foreground">Ventas</div><div className="font-display text-base">{formatRD(total)}</div></div>
              </div>
            </Card>
          );
        })}
      </div>
      <EmpleadoDialog open={showNew || !!edit} onOpenChange={(o) => { if (!o) { setShowNew(false); setEdit(null); } }} empleado={edit} tenantId={user.tenant.id} onDone={() => { setRefresh((r) => r + 1); setShowNew(false); setEdit(null); }} />
      
      <PlanLimitModal 
        open={showLimitModal} 
        onOpenChange={setShowLimitModal} 
        type="employees" 
        limit={limits.employeeLimit} 
        tenant={user.tenant} 
      />
    </div>
  );
}

function EmpleadoDialog({ open, onOpenChange, empleado, tenantId, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; empleado: Empleado | null; tenantId: string; onDone: () => void }) {
  const empty = { nombre: "", apellido: "", email: "", password: "", pin: "", rol: "VENDEDOR" as RolEmpleado, activo: true, permisos: getPermisosPorRol("VENDEDOR") };
  const [f, setF] = useState(empleado ? { ...empty, ...empleado, permisos: empleado.permisos || getPermisosPorRol(empleado.rol) } : empty);
  
  useEffect(() => { 
    if (empleado) {
      setF({ ...empty, ...empleado, permisos: empleado.permisos || getPermisosPorRol(empleado.rol) });
    } else {
      setF(empty);
    }
  }, [empleado, open]);

  const togglePermiso = (id: string) => {
    const next = f.permisos.includes(id) 
      ? f.permisos.filter(p => p !== id)
      : [...f.permisos, id];
    setF({ ...f, permisos: next });
  };

  async function submit() {
    if (!f.nombre.trim() || !f.apellido.trim() || !f.email.includes("@")) { toast.error("Nombre, apellido y email válidos requeridos"); return; }
    if (!empleado && f.password.length < 8) { toast.error("Contraseña mínima 8 caracteres"); return; }
    try {
      const e: Empleado = {
        id: empleado?.id || uid("emp"), tenant_id: tenantId, nombre: f.nombre, apellido: f.apellido || undefined, email: f.email,
        password: f.password || empleado?.password || "", pin: f.pin || undefined,
        rol: f.rol, activo: f.activo, permisos: f.permisos, creado_en: empleado?.creado_en || new Date().toISOString(),
      };
      await saveEmpleado(e); 
      toast.success("Guardado"); 
      onDone();
    } catch (err: any) {
      toast.error("Error al guardar empleado");
    }
  }
  async function remove() { 
    if (empleado) { 
      try {
        await deleteEmpleado(empleado.id); 
        toast.success("Eliminado"); 
        onDone(); 
      } catch (err) {
        toast.error("Error al eliminar");
      }
    } 
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-2xl">
        <DialogHeader><DialogTitle>{empleado ? "Editar" : "Nuevo"} empleado</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Nombre</Label><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Carlos" className="h-11 rounded-xl" /></div>
          <div><Label>Apellido</Label><Input value={f.apellido} onChange={(e) => setF({ ...f, apellido: e.target.value })} placeholder="Ej. Santana" className="h-11 rounded-xl" /></div>
          <div><Label>Email</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="empleado@correo.com" className="h-11 rounded-xl" /></div>
          <div>
            <Label>{empleado ? "Nueva contraseña" : "Contraseña"}</Label>
            <Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="Mínimo 8 caracteres" className="h-11 rounded-xl" />
            <PasswordStrengthIndicator password={f.password} />
          </div>
          <div><Label>PIN (4 dígitos)</Label><Input value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.slice(0, 4) })} placeholder="4 dígitos" className="h-11 rounded-xl" /></div>
          <div><Label>Rol</Label>
            <Select 
              value={f.rol} 
              onValueChange={(v) => {
                const rol = v as RolEmpleado;
                setF({ ...f, rol, permisos: getPermisosPorRol(rol) });
              }}
            >
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["ADMIN", "SUPERVISOR", "VENDEDOR", "RECEPCIONISTA", "REPARTIDOR"] as RolEmpleado[]).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox id="activo" checked={f.activo} onCheckedChange={(v) => setF({ ...f, activo: !!v })} />
            <Label htmlFor="activo" className="cursor-pointer">Activo</Label>
          </div>

          <div className="md:col-span-2">
            <Separator className="my-2" />
            <Label className="mb-3 block font-bold text-primary">Permisos de Acceso</Label>
            <ScrollArea className="h-[200px] rounded-xl border p-4 bg-accent/5">
              <div className="grid gap-4 sm:grid-cols-2">
                {PERMISOS_SISTEMA.map((p) => (
                  <div key={p.id} className="flex items-start gap-3 space-y-0">
                    <Checkbox 
                      id={p.id} 
                      checked={f.permisos.includes(p.id)} 
                      onCheckedChange={() => togglePermiso(p.id)}
                      disabled={f.rol === "ADMIN"}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor={p.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        {p.nombre}
                      </Label>
                      <p className="text-[10px] text-muted-foreground">{p.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {f.rol === "ADMIN" && (
              <p className="mt-2 text-[11px] text-muted-foreground italic">Los administradores tienen acceso total por defecto.</p>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          {empleado && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive rounded-xl mr-auto"><Trash2 className="mr-1.5 h-4 w-4" /> Eliminar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl border-none shadow-card">
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar a {empleado.nombre}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. El empleado perderá acceso inmediato a la plataforma.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={remove} className="bg-destructive text-white rounded-xl">Eliminar permanentemente</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-6">Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-white rounded-xl h-11 px-8 font-bold">Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const getStrength = (p: string) => {
    let score = 0;
    if (!p) return 0;
    if (p.length >= 6) score++;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strength = Math.min(4, getStrength(password));
  const colors = ["bg-slate-200", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-success"];
  const labels = ["", "Muy débil", "Débil", "Media", "Fuerte"];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i <= strength ? colors[strength] : "bg-slate-100"
            }`}
          />
        ))}
      </div>
      {password && (
        <div className="flex items-center justify-between">
          <p className={`text-[10px] font-bold uppercase tracking-wider ${strength <= 2 ? "text-orange-500" : "text-success"}`}>
            Seguridad: {labels[strength]}
          </p>
        </div>
      )}
    </div>
  );
}

function NoAccess() {
  return (
    <Card className="p-12 text-center">
      <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <h3 className="font-display text-2xl">Acceso restringido</h3>
      <p className="text-sm text-muted-foreground">Solo administradores pueden ver esta página.</p>
    </Card>
  );
}
